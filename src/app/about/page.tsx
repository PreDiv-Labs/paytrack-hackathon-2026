import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowRight, ShieldCheck, ChartNoAxesCombined, Users, Sparkles } from "lucide-react";
export const metadata = { title: "About PayTrack — A clearer financial picture" };
export default function About() {
  return (
    <main className="about-page">
      <nav className="about-nav">
        <Link href="/">
          <Brand />
        </Link>
        <Link className="button" href="/preview">
          Explore PayTrack <ArrowRight size={16} />
        </Link>
      </nav>
      <section className="about-intro">
        <span className="eyebrow">MEET PAYTRACK</span>
        <h1>
          Your money story.
          <br />
          <span>A little clearer.</span>
        </h1>
        <p>
          PayTrack brings payments, shared expenses, budgets, and financial insights into one
          thoughtful workspace—built around activity you can verify.
        </p>
        <Link className="button primary" href="/login">
          Connect with PayPal <ArrowRight size={16} />
        </Link>
      </section>
      <section className="about-features" aria-label="What PayTrack does">
        {[
          {
            icon: ShieldCheck,
            title: "Payments with a paper trail",
            text: "Review and approve a PayPal Sandbox checkout. Completed captures and refunds become ledger entries with traceable payment references.",
          },
          {
            icon: ChartNoAxesCombined,
            title: "A view that makes sense",
            text: "Explore cash flow, compare daily and weekly activity, and understand category spending. Each currency stays separate.",
          },
          {
            icon: Users,
            title: "Shared expenses, fair shares",
            text: "Create an expense, divide the amount, and share individual checkout links. Every participant approves their own payment.",
          },
          {
            icon: Sparkles,
            title: "Insights grounded in your activity",
            text: "Set category budgets and ask the copilot about recorded patterns. Summaries connect back to the records behind them.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <span className="icon-box purple">
              <Icon size={22} />
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="about-scope">
        <span className="badge amber">PayPal Sandbox</span>
        <h2>A working playground for better money habits.</h2>
        <p>
          PayTrack currently uses PayPal test accounts and simulated money. It includes activity
          verified through this app, rather than your full PayPal balance or account history. You
          stay in control of every payment.
        </p>
      </section>
      <footer className="about-footer">
        <Brand />
        <span>Verified activity. Clearer decisions.</span>
        <Link href="/preview">
          Take a look around <ArrowRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
