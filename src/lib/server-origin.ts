export function serverOrigin(env: Record<string, string | undefined> = process.env) {
  const configured = env.AUTH_URL || env.RENDER_EXTERNAL_URL;
  if (!configured) throw new Error("Configure AUTH_URL or deploy with RENDER_EXTERNAL_URL.");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Unsupported application origin.");
  return url.origin;
}
