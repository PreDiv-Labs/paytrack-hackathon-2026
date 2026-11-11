import Link from "next/link";
import { Brand } from "@/components/brand";
import { login } from "@/app/actions";
import { ShieldCheck, ArrowRight, LockKeyhole, ArrowLeft } from "lucide-react";
const messages: Record<string, string> = {
  OAuthSignin: "PayPal sign-in could not start. Check Login with PayPal configuration.",
  OAuthCallbackError:
    "PayPal could not complete sign-in. Confirm the return URL and allowed identity scopes.",
  OAuthAccountNotLinked:
    "This email is already associated with another identity. Sign in with the original PayPal account.",
  AccessDenied: "PayPal access was not granted. You can try again when ready.",
  Configuration: "Sign-in needs server configuration. Check your environment and database setup.",
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <div className="login-nav">
        <Link href="/">
          <Brand />
        </Link>
        <Link href="/preview">
          Explore workspace <ArrowRight size={15} />
        </Link>
      </div>
      <div className="login-layout">
        <section className="login-story">
          <span className="eyebrow">YOUR AI FINANCIAL COPILOT</span>
          <h1>
            Make sense
            <br />
            of every <span>move.</span>
          </h1>
          <p>
            A little clarity goes a long way. Bring your PayPal activity into focus with insights
            you can trace and decisions you control.
          </p>
          <div className="login-principle">
            <ShieldCheck size={24} />
            <div>
              <strong>Verified first. Explained second.</strong>
              <p>Your financial story starts with real payment records.</p>
            </div>
          </div>
          <span className="login-abstract">↗</span>
        </section>
        <section className="login-card">
          <span className="icon-box purple">
            <LockKeyhole size={24} />
          </span>
          <h2>Welcome to PayTrack</h2>
          <p>Connect your Sandbox account to build a clearer financial picture.</p>
          {error && (
            <div className="notice error" role="alert">
              {messages[error] ??
                "Sign-in was interrupted. Please retry, or verify your PayPal app settings."}
            </div>
          )}
          <form action={login}>
            <button className="button paypal-button" type="submit">
              <span className="paypal-monogram">P</span> Continue with PayPal{" "}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-detail">
            <ShieldCheck size={17} />
            <p>You’ll sign in securely on PayPal. We never see your PayPal password.</p>
          </div>
          <div className="divider" />
          <span className="badge amber">Sandbox environment</span>
          <p className="fine">
            Use a PayPal Sandbox Personal or Business account. PayTrack only accesses identity
            information and payments verified through this app—not your full account history or
            balance.
          </p>
          <Link className="text-link" href="/">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </section>
      </div>
    </main>
  );
}
