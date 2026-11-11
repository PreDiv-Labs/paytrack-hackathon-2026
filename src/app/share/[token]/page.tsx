import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Brand } from "@/components/brand";
import { ShareCheckout } from "@/components/share-checkout";
import { money } from "@/lib/money";
import { ShieldCheck, Check } from "lucide-react";
export default async function Share({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/.test(token)) notFound();
  const participant = await db.participant.findUnique({
    where: { token },
    include: { group: true, contribution: true },
  });
  if (!participant) notFound();
  const session = await auth();
  return (
    <main className="login-page">
      <div className="login-nav">
        <Link href="/">
          <Brand />
        </Link>
        <span className="badge amber">Sandbox only</span>
      </div>
      <div className="share-card panel">
        <span className="icon-box purple">
          <ShieldCheck size={25} />
        </span>
        <span className="eyebrow">YOUR SHARE, CLEARLY</span>
        <h1>{participant.group.title}</h1>
        <p>Share for {participant.name}</p>
        <strong className="share-amount">
          {money(participant.shareMinor, participant.group.currency)}
        </strong>
        {participant.contribution ? (
          <div className="notice">
            <Check size={17} /> This share has a verified completed capture. Refunds do not
            automatically reopen a share.
          </div>
        ) : (
          <ShareCheckout
            token={token}
            signedIn={!!session?.user}
            amount={decimalAmount(participant.shareMinor)}
            currency={participant.group.currency}
          />
        )}
        <p className="fine">
          This is a private bearer link. Payments go to the configured Sandbox Business merchant,
          not a personal wallet. Each payer must approve their own payment.
        </p>
      </div>
    </main>
  );
}
function decimalAmount(n: number) {
  return (n / 100).toFixed(2);
}
