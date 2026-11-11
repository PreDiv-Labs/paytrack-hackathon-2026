"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Link2, LogOut, Store, Users } from "lucide-react";
import { switchPayPalAccount } from "@/app/actions";

export function DividePayGuide({
  canCollect,
  identityReady,
  merchantReady,
  preview,
}: {
  canCollect: boolean;
  identityReady: boolean;
  merchantReady: boolean;
  preview: boolean;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  function openShare(event: FormEvent) {
    event.preventDefault();
    try {
      const url = new URL(link.trim(), location.origin);
      if (
        url.origin !== location.origin ||
        !/^\/share\/[a-f0-9-]{36}$/.test(url.pathname) ||
        url.search ||
        url.hash
      )
        throw new Error();
      setError("");
      router.push(url.pathname);
    } catch {
      setError(
        "Paste the private participant link from this PayTrack site. Ask your organizer for your individual link.",
      );
    }
  }
  return (
    <section className="panel collection-guide" id="organizer-guide">
      <div className="collection-role">
        <span className={`icon-box ${canCollect ? "green" : "purple"}`}>
          {canCollect ? <CheckCircle2 size={22} /> : <Users size={22} />}
        </span>
        <div>
          <span className={`badge ${canCollect ? "green" : "neutral"}`}>
            {canCollect
              ? "Organizer account connected"
              : preview
                ? "How shared expenses work"
                : "Participant workspace"}
          </span>
          <h2>
            {canCollect
              ? "You're ready to bring everyone together."
              : "One organizer. Clear shares for everyone."}
          </h2>
          <p>
            {canCollect
              ? "Create an expense, share individual payment links, and track each verified contribution here."
              : "The Sandbox Business organizer creates the expense. Each participant opens their own link and approves their share with a Sandbox Personal account."}
          </p>
        </div>
      </div>
      <div className="collection-role-grid">
        <article>
          <span className="icon-box purple">
            <Store size={20} />
          </span>
          <h3>Organizing the expense?</h3>
          <p>
            Collections belong to the Business account configured for this PayTrack app. Payments go
            directly to that organizer.
          </p>
          {!merchantReady && !preview ? (
            <div className="notice">
              The organizer account needs configuration. Check PayPal Connection before creating an
              expense.
            </div>
          ) : !identityReady && !preview ? (
            <div className="notice">
              Reconnect PayPal with account ID access to verify your organizer identity.
            </div>
          ) : null}
          {canCollect ? (
            <span className="collection-ready">
              <CheckCircle2 size={16} />
              Use “New shared expense” to begin.
            </span>
          ) : (
            <>
              <details className="organizer-instructions">
                <summary>How to sign in as the organizer</summary>
                <ol>
                  <li>Open PayPal Developer → Testing Tools → Sandbox Accounts.</li>
                  <li>Choose the Business account associated with this app.</li>
                  <li>
                    Sign out of PayTrack, then sign in using that account’s Sandbox credentials. If
                    PayPal remembers another account, choose a different account there.
                  </li>
                </ol>
              </details>
              {preview ? (
                <Link href="/login" className="button">
                  Sign in with PayPal
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <form action={switchPayPalAccount}>
                  <button type="submit" className="button">
                    <LogOut size={15} />
                    Switch PayPal account
                  </button>
                  <small className="fine">Signs you out of PayTrack and opens sign-in.</small>
                </form>
              )}
            </>
          )}
        </article>
        <article>
          <span className="icon-box blue">
            <Link2 size={20} />
          </span>
          <h3>Paying your share?</h3>
          <p>
            Ask the organizer for your private participant link. It shows your exact share before
            you review and approve checkout.
          </p>
          <form className="participant-link-form" onSubmit={openShare}>
            <label htmlFor="participant-link">Your participant link</label>
            <input
              id="participant-link"
              type="text"
              inputMode="url"
              value={link}
              maxLength={500}
              placeholder="Paste your PayTrack share link"
              onChange={(event) => {
                setLink(event.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "participant-link-error" : "participant-link-hint"}
            />
            <small id="participant-link-hint" className="fine">
              Keep your link private. Opening it does not make a payment.
            </small>
            {error && (
              <p id="participant-link-error" role="alert" className="participant-link-error">
                {error}
              </p>
            )}
            <button className="button primary" type="submit" disabled={!link.trim()}>
              Open my share
              <ArrowRight size={15} />
            </button>
          </form>
        </article>
      </div>
      <div className="collection-footnote">
        Sandbox only · Individual approved payments to the organizer · No escrow or friend-to-friend
        wallet transfers
      </div>
    </section>
  );
}
