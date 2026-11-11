import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChartNoAxesCombined,
  ScanLine,
  Check,
  LockKeyhole,
} from "lucide-react";
import { Brand } from "@/components/brand";
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/overview");
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Brand />
        <div>
          <a href="#how-it-works">How it works</a>
          <Link href="/preview">Explore the workspace</Link>
          <Link className="button primary" href="/login">
            Connect PayPal <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> CLARITY FOR EVERY PAYMENT
          </span>
          <h1>
            Your money.
            <br />A clearer <span>picture.</span>
          </h1>
          <p>
            Meet your financial copilot for PayPal. Turn verified payments into understandable
            insights, thoughtful budgets, and better everyday decisions.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/login">
              Get started with PayPal <ArrowRight size={17} />
            </Link>
            <Link className="button" href="/preview">
              Take a look inside
            </Link>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={16} /> Sandbox only <span>·</span> Evidence behind every insight{" "}
            <span>·</span> You’re in control
          </div>
        </div>
        <div className="hero-art" aria-label="PayTrack product principles">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-label">
            <span className="live-dot" /> A little more perspective.
          </div>
          <div className="art-main">
            <span className="icon-box purple">
              <ChartNoAxesCombined size={26} />
            </span>
            <p>FROM PAYMENTS TO PERSPECTIVE</p>
            <h2>
              Less guesswork.
              <br />
              More confidence.
            </h2>
            <div className="art-flow">
              <span>
                <ScanLine size={18} /> Verify
              </span>
              <ArrowRight size={16} />
              <span>
                <Sparkles size={18} /> Understand
              </span>
            </div>
            <div className="art-footer">
              <ShieldCheck size={16} /> Grounded in your recorded activity
            </div>
          </div>
          <div className="art-note">
            <span className="icon-box green">
              <Check size={18} />
            </span>
            <div>
              <strong>Every insight has a source.</strong>
              <small>Follow the evidence to the payment.</small>
            </div>
          </div>
          <div className="art-corner">
            P<span>↗</span>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="landing-features">
        <div>
          <span className="eyebrow">A MORE THOUGHTFUL WAY TO TRACK</span>
          <h2>
            Connected payments.
            <br />
            Considered decisions.
          </h2>
        </div>
        <article>
          <ShieldCheck />
          <h3>Start with the facts</h3>
          <p>
            Only verified PayPal captures enter your ledger. No invented balances or imported
            assumptions.
          </p>
        </article>
        <article>
          <Sparkles />
          <h3>Understand the why</h3>
          <p>
            Explore spending with a copilot that points you back to the records behind the answer.
          </p>
        </article>
        <article>
          <LockKeyhole />
          <h3>Keep the final say</h3>
          <p>
            Review every budget suggestion. Approve every payment in PayPal. Your money, your
            decisions.
          </p>
        </article>
      </section>
      <footer className="landing-footer">
        <Brand />
        <span>Built for clarity. Powered by verified activity.</span>
        <span>PayPal Sandbox · No real money</span>
      </footer>
    </main>
  );
}
