import "server-only";
import { auth } from "@/auth";
import { serverOrigin } from "./server-origin";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Sign in with PayPal to continue.");
  return session.user.id;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = serverOrigin();
  if (origin !== expected) throw new HttpError(403, "This request must come from PayTrack.");
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json({ error: "Check the submitted values and try again." }, { status: 400 });
  console.error("PayTrack request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json(
    { error: "The request could not be completed. Please retry; no success has been recorded." },
    { status: 503 },
  );
}
