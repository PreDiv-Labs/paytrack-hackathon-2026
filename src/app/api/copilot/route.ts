import { z } from "zod";
import { db } from "@/lib/db";
import { askCopilot } from "@/lib/copilot";
import { requireUser, sameOrigin, errorResponse } from "@/lib/security";
import { currencies } from "@/lib/money";
const schema = z.object({
  question: z.string().trim().min(2).max(500),
  currency: z.enum(currencies),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(12)
    .default([]),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    const input = schema.parse(await request.json());
    const entries = await db.ledgerEntry.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 10001,
    });
    if (entries.length > 10000) throw new Error("Analysis limit exceeded");
    const budgets = await db.budget.findMany({
      where: { userId },
      select: { category: true, currency: true, month: true, limitMinor: true },
    });
    return Response.json(
      await askCopilot(
        input.question,
        entries,
        budgets,
        input.currency,
        input.month,
        input.history,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
