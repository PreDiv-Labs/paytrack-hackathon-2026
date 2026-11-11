import { z } from "zod";
import { createOrder } from "@/lib/payments";
import { categories, currencies, toMinor } from "@/lib/money";
import { requireUser, sameOrigin, errorResponse } from "@/lib/security";
const schema = z.object({
  description: z.string().trim().min(2).max(120),
  category: z.string().refine((v) => categories.includes(v)),
  amount: z.string(),
  currency: z.enum(currencies),
  requestKey: z.uuid(),
  participantToken: z.uuid().optional(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    const input = schema.parse(await request.json());
    return Response.json(
      await createOrder(userId, { ...input, amountMinor: toMinor(input.amount) }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
