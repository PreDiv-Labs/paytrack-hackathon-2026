import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, sameOrigin, errorResponse } from "@/lib/security";
import { currencies, categories, toMinor } from "@/lib/money";
const schema = z.object({
  category: z.string().refine((v) => categories.includes(v)),
  amount: z.string(),
  currency: z.enum(currencies),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  confirmed: z.literal(true),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    const input = schema.parse(await request.json());
    const limitMinor = toMinor(input.amount);
    const budget = await db.budget.upsert({
      where: {
        userId_category_currency_month: {
          userId,
          category: input.category,
          currency: input.currency,
          month: input.month,
        },
      },
      create: {
        userId,
        category: input.category,
        currency: input.currency,
        month: input.month,
        limitMinor,
      },
      update: { limitMinor },
    });
    return Response.json({ id: budget.id });
  } catch (e) {
    return errorResponse(e);
  }
}
