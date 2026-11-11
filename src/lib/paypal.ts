import "server-only";
import { environment } from "./env";
import { HttpError } from "./security";
import { webhookPayload, assertVerified } from "./webhook-checks";
const base = "https://api-m.sandbox.paypal.com";
let cached: { token: string; expires: number } | undefined;
export async function merchantToken() {
  if (cached && cached.expires > Date.now()) return cached.token;
  const env = environment();
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new HttpError(
      503,
      "PayPal Sandbox authentication is unavailable. Check merchant credentials.",
    );
  const body = await response.json();
  cached = {
    token: body.access_token,
    expires: Date.now() + Math.max(0, body.expires_in - 60) * 1000,
  };
  return cached.token;
}
export async function paypal<T>(
  path: string,
  method = "GET",
  body?: unknown,
  requestId?: string,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await merchantToken()}`,
        "Content-Type": "application/json",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (response.ok) return (await response.json()) as T;
    if (response.status === 401) cached = undefined;
    const retryable = response.status === 429 || response.status >= 500 || response.status === 401;
    if (retryable && attempt < 2 && (method === "GET" || requestId)) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      continue;
    }
    throw new HttpError(
      response.status >= 500 ? 503 : 422,
      "PayPal could not complete this operation. Check the order and retry safely.",
    );
  }
  throw new HttpError(503, "PayPal is temporarily unavailable.");
}
export type Order = {
  id: string;
  status: string;
  payer?: { payer_id?: string };
  payment_source?: { paypal?: { account_id?: string } };
  purchase_units: {
    reference_id?: string;
    custom_id?: string;
    payee?: { merchant_id?: string };
    amount?: { value: string; currency_code: string };
    payments?: {
      captures?: {
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
        create_time?: string;
      }[];
    };
  }[];
  links?: { rel: string; href: string }[];
};
export type Refund = {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  create_time?: string;
};
export async function verifyWebhook(headers: Headers, event: unknown) {
  const id = environment().PAYPAL_WEBHOOK_ID;
  if (!id) throw new HttpError(503, "Webhook verification has not been configured.");
  let payload;
  try {
    payload = webhookPayload(headers, event, id);
  } catch {
    throw new HttpError(400, "Invalid PayPal verification headers.");
  }
  const result = await paypal<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    "POST",
    payload,
  );
  try {
    assertVerified(result.verification_status);
  } catch {
    throw new HttpError(400, "PayPal webhook signature did not verify.");
  }
}
