import { captureOrder } from "@/lib/payments";
import { requireUser, sameOrigin, errorResponse } from "@/lib/security";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const userId = await requireUser();
    return Response.json(await captureOrder(userId, (await params).id));
  } catch (e) {
    return errorResponse(e);
  }
}
