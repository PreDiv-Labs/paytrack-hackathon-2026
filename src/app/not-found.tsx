import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>This page is off the map.</h1>
      <p>Let’s get you back to your financial picture.</p>
      <Link className="button primary" href="/">
        Back to PayTrack
      </Link>
    </main>
  );
}
