import { z } from "zod";
import { db } from "@/lib/db";
import { analyze } from "@/lib/analytics";
import { askCopilot } from "@/lib/copilot";
import { requireUser, sameOrigin, errorResponse } from "@/lib/security";
import { currencies } from "@/lib/money";
const schema = z.object({
  question: z.string().trim().min(2).max(500),
  currency: z.enum(currencies),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    const input = schema.parse(await request.json());
    const entries = await db.ledgerEntry.findMany({
      where: { userId, currency: input.currency },
      orderBy: { occurredAt: "desc" },
      take: 10001,
    });
    if (entries.length > 10000) throw new Error("Analysis limit exceeded");
    return Response.json(
      await askCopilot(input.question, analyze(entries, input.currency, input.month)),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
