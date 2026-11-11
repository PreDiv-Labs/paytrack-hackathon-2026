import "server-only";
import { db } from "./db";
import { readiness } from "./env";
import { analyze, type Entry } from "./analytics";
import { canCollectSharedExpenses } from "./collection-access";
export async function workspace(
  userId: string,
  currency = "USD",
  month = new Date().toISOString().slice(0, 7),
) {
  const [user, entries, budgets, groups, notifications, payments, connection] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
    db.ledgerEntry.findMany({ where: { userId }, orderBy: { occurredAt: "desc" }, take: 10001 }),
    db.budget.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.splitGroup.findMany({
      where: { creatorId: userId },
      include: { participants: { include: { contribution: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.payment.findMany({
      where: { ownerId: userId, status: { in: ["CREATED", "PENDING"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.payPalConnection.findUnique({
      where: { userId },
      select: { payerId: true, connectedAt: true },
    }),
  ]);
  if (entries.length > 10000) throw new Error("Ledger exceeds the interactive analysis limit.");
  return {
    canCollectSharedExpenses: canCollectSharedExpenses(
      connection?.payerId,
      process.env.PAYPAL_MERCHANT_ID,
    ),
    user,
    entries: entries.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() })),
    budgets: budgets.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
    groups: groups.map((g) => ({ ...g, createdAt: g.createdAt.toISOString() })),
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    })),
    payments: payments.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      completedAt: null,
    })),
    connection: connection
      ? { payerId: connection.payerId, connectedAt: connection.connectedAt.toISOString() }
      : null,
    readiness: readiness(),
    analytics: analyze(entries, currency, month),
  };
}
export type Workspace = Awaited<ReturnType<typeof workspace>>;
export function emptyWorkspace(): Workspace {
  return {
    canCollectSharedExpenses: false,
    user: { name: "Your workspace", email: null },
    entries: [],
    budgets: [],
    groups: [],
    notifications: [],
    payments: [],
    connection: null,
    readiness: { database: false, paypal: false, webhook: false, merchant: false, ai: false },
    analytics: analyze([] as Entry[], "USD", new Date().toISOString().slice(0, 7)),
  };
}
