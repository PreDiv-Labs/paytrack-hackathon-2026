"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
export function ShareCheckout({
  token,
  signedIn,
  amount,
  currency,
}: {
  token: string;
  signedIn: boolean;
  amount: string;
  currency: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  if (!signedIn)
    return (
      <>
        <Link href="/login" className="button primary full">
          Sign in with PayPal <ArrowRight size={16} />
        </Link>
        <p className="fine">Return to this private link after signing in to approve your share.</p>
      </>
    );
  return (
    <>
      <button
        className="button primary full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/payments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: "Shared expense",
                category: "Shared expenses",
                amount,
                currency,
                requestKey: key,
                participantToken: token,
              }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            location.assign(result.approvalUrl);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not create checkout.");
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <>
            Review & approve on PayPal <ArrowRight size={16} />
          </>
        )}
      </button>
      {error && <div className="notice error">{error}</div>}
    </>
  );
}
