import type { Prisma, Payment } from "@prisma/client";
import { validateCapture } from "./payment-checks";
export async function backfillMerchant(
  tx: Prisma.TransactionClient,
  userId: string,
  payerId: string,
) {
  const connection = await tx.payPalConnection.findUnique({ where: { userId } });
  if (connection?.payerId !== payerId)
    throw new Error("Merchant identity is not verified for this user.");
  const payments = await tx.payment.findMany({
    where: {
      merchantId: payerId,
      captureId: { not: null },
      status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
    },
  });
  for (const payment of payments) {
    const capture = await tx.ledgerEntry.findFirst({
      where: {
        paymentId: payment.id,
        userId: payment.ownerId,
        kind: "CAPTURE",
        reference: payment.captureId!,
      },
    });
    if (!capture) continue;
    await tx.ledgerEntry.upsert({
      where: {
        userId_reference_direction: { userId, reference: capture.reference, direction: "RECEIVED" },
      },
      create: {
        userId,
        paymentId: payment.id,
        reference: capture.reference,
        direction: "RECEIVED",
        kind: "CAPTURE",
        amountMinor: capture.amountMinor,
        currency: capture.currency,
        description: capture.description,
        category: capture.category,
        occurredAt: capture.occurredAt,
      },
      update: {},
    });
    const refunds = await tx.ledgerEntry.findMany({
      where: { paymentId: payment.id, userId: payment.ownerId, kind: "REFUND" },
    });
    for (const refund of refunds)
      await tx.ledgerEntry.upsert({
        where: {
          userId_reference_direction: { userId, reference: refund.reference, direction: "SENT" },
        },
        create: {
          userId,
          paymentId: payment.id,
          reference: refund.reference,
          direction: "SENT",
          kind: "REFUND",
          amountMinor: refund.amountMinor,
          currency: refund.currency,
          description: refund.description,
          category: refund.category,
          occurredAt: refund.occurredAt,
        },
        update: {},
      });
  }
}
export async function recordCapture(
  tx: Prisma.TransactionClient,
  payment: Payment,
  verified: ReturnType<typeof validateCapture>,
) {
  const updated = await tx.payment.updateMany({
    where: {
      id: payment.id,
      status: { in: ["CREATED", "PENDING", "COMPLETED"] },
      OR: [{ captureId: null }, { captureId: verified.captureId }],
    },
    data: { status: "COMPLETED", captureId: verified.captureId, completedAt: verified.occurredAt },
  });
  if (updated.count !== 1) {
    const latest = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    if (latest.status === "REFUNDED" || latest.status === "PARTIALLY_REFUNDED")
      return { status: latest.status, id: payment.id };
    throw new Error("Payment reconciliation conflict. Retry required.");
  }
  const merchant = await tx.payPalConnection.findUnique({
    where: { payerId: verified.merchantId },
  });
  const parties = [
    { userId: payment.ownerId, direction: "SENT" },
    ...(merchant ? [{ userId: merchant.userId, direction: "RECEIVED" }] : []),
  ];
  for (const party of parties) {
    const where = { userId_reference_direction: { ...party, reference: verified.captureId } };
    const existing = await tx.ledgerEntry.findUnique({ where });
    await tx.ledgerEntry.upsert({
      where,
      create: {
        ...party,
        paymentId: payment.id,
        reference: verified.captureId,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        description: payment.description,
        category: payment.category,
        occurredAt: verified.occurredAt,
      },
      update: {},
    });
    if (!existing)
      await tx.notification.create({
        data: {
          userId: party.userId,
          title: "Payment verified",
          message: `${payment.description} was verified against PayPal capture ${verified.captureId}.`,
        },
      });
  }
  if (payment.participantId)
    await tx.contribution.upsert({
      where: { participantId: payment.participantId },
      create: {
        participantId: payment.participantId,
        paymentId: payment.id,
        amountMinor: payment.amountMinor,
      },
      update: {},
    });
  return { status: "COMPLETED", id: payment.id, captureId: verified.captureId };
}

export async function recordRefund(
  tx: Prisma.TransactionClient,
  payment: Payment,
  refund: { id: string; amountMinor: number; occurredAt: Date },
) {
  // Lock the payment to serialize multiple refund events.
  await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
  const captures = await tx.ledgerEntry.findMany({
    where: { paymentId: payment.id, kind: "CAPTURE" },
  });
  if (
    !captures.length ||
    !Number.isSafeInteger(refund.amountMinor) ||
    refund.amountMinor <= 0 ||
    refund.amountMinor > payment.amountMinor
  )
    throw new Error("A valid verified capture is required for refund reconciliation.");
  for (const entry of captures) {
    const direction = entry.direction === "SENT" ? "RECEIVED" : "SENT";
    await tx.ledgerEntry.upsert({
      where: {
        userId_reference_direction: { userId: entry.userId, reference: refund.id, direction },
      },
      create: {
        userId: entry.userId,
        paymentId: payment.id,
        reference: refund.id,
        direction,
        kind: "REFUND",
        amountMinor: refund.amountMinor,
        currency: payment.currency,
        description: `Refund · ${payment.description}`,
        category: payment.category,
        occurredAt: refund.occurredAt,
      },
      update: {},
    });
  }
  const refunds = await tx.ledgerEntry.aggregate({
    where: { paymentId: payment.id, userId: payment.ownerId, kind: "REFUND" },
    _sum: { amountMinor: true },
  });
  const total = refunds._sum.amountMinor ?? 0;
  if (total > payment.amountMinor) throw new Error("Refund total exceeds capture.");
  await tx.payment.update({
    where: { id: payment.id },
    data: { status: total === payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
}
