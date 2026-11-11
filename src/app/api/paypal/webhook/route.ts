import { z } from "zod";
import { db } from "@/lib/db";
import { verifyWebhook, paypal, type Refund } from "@/lib/paypal";
import { reconcileOrder, reconcileRefund } from "@/lib/payments";
import { errorResponse, HttpError } from "@/lib/security";
const schema = z.object({
  id: z.string(),
  event_type: z.string(),
  resource: z
    .object({
      id: z.string(),
      links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
      supplementary_data: z
        .object({
          related_ids: z.object({
            order_id: z.string().optional(),
            capture_id: z.string().optional(),
          }),
        })
        .optional(),
    })
    .passthrough(),
});
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 1000000) throw new HttpError(413, "Event too large.");
    const raw = JSON.parse(text);
    await verifyWebhook(request.headers, raw);
    const event = schema.parse(raw);
    const existing = await db.webhookEvent.upsert({
      where: { id: event.id },
      create: { id: event.id, eventType: event.event_type },
      update: {},
    });
    if (existing.processedAt) return Response.json({ received: true, duplicate: true });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event.resource.supplementary_data?.related_ids.order_id;
      if (!orderId) throw new HttpError(400, "Capture order reference is missing.");
      await reconcileOrder(orderId);
    } else if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      let captureId = event.resource.supplementary_data?.related_ids.capture_id;
      if (!captureId) {
        const link = event.resource.links?.find((l) => l.rel === "up");
        if (link) {
          const url = new URL(link.href);
          if (
            url.protocol === "https:" &&
            ["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"].includes(url.hostname)
          )
            captureId = url.pathname.match(/^\/v2\/payments\/captures\/([A-Z0-9]+)$/)?.[1];
        }
      }
      if (!captureId) throw new HttpError(400, "Refund capture reference is missing.");
      const refund = await paypal<Refund>(
        `/v2/payments/refunds/${encodeURIComponent(event.resource.id)}`,
      );
      await reconcileRefund(captureId, refund);
    } else if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
      const orderId = event.resource.supplementary_data?.related_ids.order_id;
      if (orderId)
        await db.payment.updateMany({
          where: { orderId, status: { in: ["CREATED", "PENDING"] }, captureId: null },
          data: { status: "FAILED" },
        });
    }
    await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return Response.json({ received: true });
  } catch (e) {
    return errorResponse(e);
  }
}
