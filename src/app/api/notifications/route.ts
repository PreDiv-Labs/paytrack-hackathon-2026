import { db } from "@/lib/db";
import { requireUser, sameOrigin, errorResponse } from "@/lib/security";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
