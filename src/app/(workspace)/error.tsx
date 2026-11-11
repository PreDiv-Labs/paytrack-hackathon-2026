"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>We couldn’t load your workspace.</h1>
      <p>
        Your financial records have not been changed. Check your database connection and try again.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="button" href="/">
        Back to home
      </Link>
    </main>
  );
}
