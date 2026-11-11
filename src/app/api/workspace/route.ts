import { requireUser, errorResponse } from "@/lib/security";
import { workspace } from "@/lib/workspace";
export async function GET() {
  try {
    return Response.json(await workspace(await requireUser()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
