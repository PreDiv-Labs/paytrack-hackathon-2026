import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { OAuthConfig } from "next-auth/providers";
import { db } from "@/lib/db";
import { backfillMerchant } from "@/lib/ledger";
import { serverOrigin } from "@/lib/server-origin";

// Render supplies its stable HTTPS origin before PayPal callback settings are configured.
if (!process.env.AUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.AUTH_URL = serverOrigin();
}
type Profile = { user_id?: string; sub?: string; payer_id?: string; name?: string; email?: string };
const paypal: OAuthConfig<Profile> = {
  id: "paypal",
  name: "PayPal Sandbox",
  type: "oauth",
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  authorization: {
    url: "https://www.sandbox.paypal.com/connect",
    params: {
      scope: "openid profile email https://uri.paypal.com/services/paypalattributes",
      flowEntry: "static",
    },
  },
  token: { url: "https://api-m.sandbox.paypal.com/v1/oauth2/token" },
  userinfo: "https://api-m.sandbox.paypal.com/v1/identity/openidconnect/userinfo?schema=openid",
  checks: ["state"],
  profile(p) {
    const subject = p.user_id ?? p.sub;
    if (!subject) throw new Error("PayPal identity was missing.");
    return { id: subject, name: p.name ?? "PayPal member", email: p.email ?? null, image: null };
  },
};
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [paypal],
  session: { strategy: "database" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!user.id || account?.provider !== "paypal") return;
      const p = (profile ?? {}) as Profile;
      await db.payPalConnection.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          subject: account.providerAccountId,
          payerId: p.payer_id || null,
        },
        update: { payerId: p.payer_id || null },
      });
      // OAuth tokens are not needed after identity verification. Keep them out of persistent storage.
      await db.account.updateMany({
        where: { userId: user.id, provider: "paypal" },
        data: { access_token: null, refresh_token: null, id_token: null },
      });
      if (p.payer_id)
        await db.$transaction((tx) => backfillMerchant(tx, user.id!, p.payer_id!), {
          timeout: 60000,
        });
    },
  },
});
