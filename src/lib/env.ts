import "server-only";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.url(),
  PAYPAL_ENVIRONMENT: z.literal("sandbox"),
  PAYPAL_CLIENT_ID: z.string().min(10),
  PAYPAL_CLIENT_SECRET: z.string().min(10),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MERCHANT_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3-flash-preview"),
});
export function environment() {
  const result = schema.safeParse({
    ...process.env,
    AUTH_URL: process.env.AUTH_URL || process.env.RENDER_EXTERNAL_URL,
  });
  if (!result.success)
    throw new Error("PayTrack setup is incomplete. Check the server environment configuration.");
  return result.data;
}
export function readiness() {
  return {
    database: !!process.env.DATABASE_URL,
    paypal: !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET,
    webhook: !!process.env.PAYPAL_WEBHOOK_ID,
    merchant: !!process.env.PAYPAL_MERCHANT_ID,
    ai: !!process.env.GEMINI_API_KEY,
  };
}
