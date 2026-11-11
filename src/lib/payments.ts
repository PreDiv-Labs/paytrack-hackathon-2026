import "server-only";
import { serverOrigin } from "./server-origin";
import { createHash } from "node:crypto";
import { db } from "./db";
import { paypal, type Order, type Refund } from "./paypal";
import { decimal, toMinor } from "./money";
import { HttpError } from "./security";
import { validateCapture } from "./payment-checks";
import { recordCapture, recordRefund } from "./ledger";
const key = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 38);
export async function createOrder(
  userId: string,
  input: {
    description: string;
    category: string;
    amountMinor: number;
    currency: string;
    requestKey: string;
    participantToken?: string;
  },
) {
  const connection = await db.payPalConnection.findUnique({ where: { userId } });
  if (!connection?.payerId)
    throw new HttpError(
      409,
      "PayPal did not share your payer ID. Enable PayPal account ID in Login with PayPal settings, then reconnect.",
    );
  const merchantId = process.env.PAYPAL_MERCHANT_ID;
  if (!merchantId)
    throw new HttpError(503, "The Sandbox merchant ID must be configured before checkout.");
  if (connection.payerId === merchantId)
    throw new HttpError(
      409,
      "Use a Sandbox Personal account to pay the configured Business merchant.",
    );
  let description = input.description,
    amountMinor = input.amountMinor,
    currency = input.currency,
    category = input.category,
    participantId: string | undefined;
  if (input.participantToken) {
    const participant = await db.participant.findUnique({
      where: { token: input.participantToken },
      include: { group: true, contribution: true },
    });
    if (!participant || participant.contribution)
      throw new HttpError(409, "This share is unavailable or has already been paid.");
    participantId = participant.id;
    amountMinor = participant.shareMinor;
    currency = participant.group.currency;
    description = participant.group.title;
    category = "Shared expenses";
    const existing = await db.payment.findUnique({ where: { participantId } });
    if (existing) {
      if (existing.ownerId !== userId)
        throw new HttpError(
          409,
          "This share already has a checkout in progress with another signed-in payer.",
        );
      if (existing.approvalUrl && existing.status === "PENDING")
        return { id: existing.id, orderId: existing.orderId, approvalUrl: existing.approvalUrl };
      throw new HttpError(
        409,
        "This share already has an order. Review it on the Pay page before retrying.",
      );
    }
  }
  const requestKey = key(`${userId}:${input.requestKey}`);
  const payment = await db.payment.upsert({
    where: { requestKey },
    create: {
      ownerId: userId,
      requestKey,
      description,
      category,
      amountMinor,
      currency,
      payerId: connection.payerId,
      merchantId,
      participantId,
    },
    update: {},
  });
  if (
    payment.amountMinor !== amountMinor ||
    payment.currency !== currency ||
    payment.description !== description ||
    payment.category !== category ||
    payment.participantId !== (participantId ?? null)
  )
    throw new HttpError(409, "This request key was already used for another payment.");
  if (payment.status === "COMPLETED" || payment.status === "REFUNDED")
    throw new HttpError(409, "This payment has already completed.");
  if (payment.approvalUrl)
    return { id: payment.id, orderId: payment.orderId, approvalUrl: payment.approvalUrl };
  const origin = serverOrigin();
  const order = await paypal<Order>(
    "/v2/checkout/orders",
    "POST",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment.id,
          custom_id: payment.id,
          description,
          amount: { currency_code: currency, value: decimal(amountMinor) },
          payee: { merchant_id: merchantId },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "PayTrack",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: `${origin}/pay?approved=${payment.id}`,
            cancel_url: `${origin}/pay?cancelled=${payment.id}`,
          },
        },
      },
    },
    key(`create:${payment.id}`),
  );
  const approvalUrl = order.links?.find(
    (l) => l.rel === "payer-action" || l.rel === "approve",
  )?.href;
  if (!approvalUrl || new URL(approvalUrl).hostname !== "www.sandbox.paypal.com")
    throw new HttpError(502, "PayPal did not provide a valid Sandbox approval link.");
  await db.payment.update({
    where: { id: payment.id },
    data: { orderId: order.id, approvalUrl, status: "PENDING" },
  });
  return { id: payment.id, orderId: order.id, approvalUrl };
}
export async function reconcileOrder(orderId: string) {
  const order = await paypal<Order>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  const payment = await db.payment.findUnique({ where: { orderId } });
  if (!payment) return { status: "IGNORED" };
  const verified = validateCapture(payment, order, payment.id);
  return db.$transaction((tx) => recordCapture(tx, payment, verified));
}
export async function captureOrder(userId: string, id: string) {
  const payment = await db.payment.findFirst({ where: { id, ownerId: userId } });
  if (!payment?.orderId) throw new HttpError(404, "Payment not found.");
  if (payment.captureId) return reconcileOrder(payment.orderId);
  const order = await paypal<Order>(`/v2/checkout/orders/${encodeURIComponent(payment.orderId)}`);
  const payer = order.payer?.payer_id ?? order.payment_source?.paypal?.account_id;
  if (payer !== payment.payerId)
    throw new HttpError(
      403,
      "Approve this order using the same PayPal account you signed in with.",
    );
  const unit = order.purchase_units[0];
  if (
    order.purchase_units.length !== 1 ||
    unit.custom_id !== payment.id ||
    unit.payee?.merchant_id !== payment.merchantId ||
    !unit.amount ||
    toMinor(unit.amount.value) !== payment.amountMinor ||
    unit.amount.currency_code !== payment.currency
  )
    throw new HttpError(409, "Order details changed. Capture was blocked before money moved.");
  if (order.status !== "COMPLETED") {
    if (order.status !== "APPROVED")
      throw new HttpError(409, "Approve the order in PayPal before capturing it.");
    await paypal<Order>(
      `/v2/checkout/orders/${encodeURIComponent(payment.orderId)}/capture`,
      "POST",
      {},
      key(`capture:${payment.id}`),
    );
  }
  return reconcileOrder(payment.orderId);
}
export async function reconcileRefund(captureId: string, refund: Refund) {
  if (refund.status !== "COMPLETED") return;
  let payment = await db.payment.findUnique({ where: { captureId } });
  if (!payment) {
    // Refund notifications can arrive before the capture notification.
    const capture = await paypal<{
      supplementary_data?: { related_ids?: { order_id?: string } };
      links?: { rel: string; href: string }[];
    }>(`/v2/payments/captures/${encodeURIComponent(captureId)}`);
    let orderId = capture.supplementary_data?.related_ids?.order_id;
    if (!orderId) {
      const link = capture.links?.find((l) => l.rel === "up");
      if (link) {
        const url = new URL(link.href);
        if (["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"].includes(url.hostname))
          orderId = url.pathname.match(/^\/v2\/checkout\/orders\/([A-Z0-9]+)$/)?.[1];
      }
    }
    if (orderId && (await db.payment.findUnique({ where: { orderId } }))) {
      await reconcileOrder(orderId);
      payment = await db.payment.findUnique({ where: { captureId } });
      if (!payment)
        throw new HttpError(
          503,
          "Capture reconciliation must complete before this refund can be processed.",
        );
    }
  }
  if (!payment || !payment.orderId) return;
  const amountMinor = toMinor(refund.amount.value);
  if (refund.amount.currency_code !== payment.currency || amountMinor > payment.amountMinor)
    throw new Error("Refund amount mismatch.");
  const verifiedPayment = payment;
  await db.$transaction((tx) =>
    recordRefund(tx, verifiedPayment, {
      id: refund.id,
      amountMinor,
      occurredAt: refund.create_time ? new Date(refund.create_time) : new Date(),
    }),
  );
}
