import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, sameOrigin, errorResponse, HttpError } from "@/lib/security";
import { currencies, toMinor, splitEqual } from "@/lib/money";
const schema = z.object({
  title: z.string().trim().min(2).max(100),
  amount: z.string(),
  currency: z.enum(currencies),
  participants: z
    .array(z.object({ name: z.string().trim().min(1).max(50), amount: z.string().optional() }))
    .min(2)
    .max(30),
  mode: z.enum(["equal", "custom"]),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    const connection = await db.payPalConnection.findUnique({ where: { userId } });
    if (!process.env.PAYPAL_MERCHANT_ID || connection?.payerId !== process.env.PAYPAL_MERCHANT_ID)
      throw new HttpError(
        403,
        "Only the connected Sandbox Business merchant can collect shared expenses. Participant payments go directly to that merchant.",
      );
    const input = schema.parse(await request.json()),
      total = toMinor(input.amount),
      shares =
        input.mode === "equal"
          ? splitEqual(total, input.participants.length)
          : input.participants.map((p) => toMinor(p.amount ?? ""));
    if (shares.reduce((a, b) => a + b, 0) !== total)
      throw new HttpError(400, "Custom shares must add up to the total exactly.");
    const group = await db.splitGroup.create({
      data: {
        creatorId: userId,
        title: input.title,
        amountMinor: total,
        currency: input.currency,
        participants: {
          create: input.participants.map((p, i) => ({ name: p.name, shareMinor: shares[i] })),
        },
      },
    });
    return Response.json({ id: group.id });
  } catch (e) {
    return errorResponse(e);
  }
}
