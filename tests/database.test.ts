import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { recordCapture, recordRefund, backfillMerchant } from "../src/lib/ledger";
test("capture reconciliation is idempotent and isolated by user (rollback-only integration test)", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).searchParams.get("schema"), "paytrack_v1");
  const db = new PrismaClient();
  const marker = `rollback-test-${crypto.randomUUID()}`;
  const rollback = new Error("INTENTIONAL TEST ROLLBACK");
  try {
    await assert.rejects(
      db.$transaction(
        async (tx) => {
          const payer = await tx.user.create({
              data: { id: marker, name: "Rollback-only test identity" },
            }),
            merchant = await tx.user.create({ data: { name: "Rollback-only merchant" } }),
            stranger = await tx.user.create({
              data: { name: "Rollback-only unauthorized identity" },
            });
          await tx.payPalConnection.create({
            data: { userId: merchant.id, subject: marker, payerId: marker },
          });
          const payment = await tx.payment.create({
            data: {
              ownerId: payer.id,
              requestKey: marker,
              description: "Rollback-only test fixture",
              amountMinor: 1250,
              currency: "USD",
              orderId: marker,
              payerId: marker + "payer",
              merchantId: marker,
            },
          });
          const verified = {
            captureId: marker,
            payerId: marker + "payer",
            merchantId: marker,
            occurredAt: new Date(),
          };
          await recordCapture(tx, payment, verified);
          await recordCapture(tx, payment, verified);
          await recordCapture(tx, payment, verified);
          assert.equal(await tx.ledgerEntry.count({ where: { paymentId: payment.id } }), 2);
          assert.equal(await tx.ledgerEntry.count({ where: { userId: stranger.id } }), 0);
          assert.equal(
            await tx.notification.count({ where: { userId: { in: [payer.id, merchant.id] } } }),
            2,
          );
          const rows = await tx.ledgerEntry.findMany({ where: { paymentId: payment.id } });
          assert.equal(rows.find((r) => r.direction === "SENT")!.userId, payer.id);
          assert.equal(rows.find((r) => r.direction === "RECEIVED")!.userId, merchant.id);
          assert.equal(
            (await tx.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
            "COMPLETED",
          );
          await assert.rejects(recordCapture(tx, payment, { ...verified, captureId: "conflict" }));
          const refund = { id: marker + "-refund-1", amountMinor: 500, occurredAt: new Date() };
          await recordRefund(tx, payment, refund);
          await recordRefund(tx, payment, refund);
          assert.equal(
            await tx.ledgerEntry.count({ where: { paymentId: payment.id, kind: "REFUND" } }),
            2,
          );
          assert.equal(
            (await tx.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
            "PARTIALLY_REFUNDED",
          );
          await recordRefund(tx, payment, {
            ...refund,
            id: marker + "-refund-2",
            amountMinor: 750,
          });
          assert.equal(
            (await tx.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
            "REFUNDED",
          );
          assert.equal(
            (await recordCapture(tx, payment, verified)).status,
            "REFUNDED",
            "late capture webhook must not regress refund status",
          );
          assert.equal(
            (
              await tx.ledgerEntry.aggregate({
                where: { userId: payer.id, kind: "REFUND" },
                _sum: { amountMinor: true },
              })
            )._sum.amountMinor,
            1250,
          );
          const lateMerchant = await tx.user.create({
            data: { name: "Rollback-only later merchant" },
          });
          const latePayment = await tx.payment.create({
            data: {
              ownerId: payer.id,
              requestKey: marker + "-late",
              description: "Rollback-only later attribution",
              amountMinor: 1000,
              currency: "EUR",
              orderId: marker + "-late",
              payerId: marker + "-latepayer",
              merchantId: marker + "-latemerchant",
            },
          });
          await recordCapture(tx, latePayment, {
            ...verified,
            captureId: marker + "-latecapture",
            merchantId: marker + "-latemerchant",
          });
          await recordRefund(tx, latePayment, {
            id: marker + "-laterefund",
            amountMinor: 250,
            occurredAt: new Date(),
          });
          await tx.payPalConnection.create({
            data: {
              userId: lateMerchant.id,
              subject: marker + "-latemerchant",
              payerId: marker + "-latemerchant",
            },
          });
          await backfillMerchant(tx, lateMerchant.id, marker + "-latemerchant");
          await backfillMerchant(tx, lateMerchant.id, marker + "-latemerchant");
          const lateEntries = await tx.ledgerEntry.findMany({
            where: { userId: lateMerchant.id, paymentId: latePayment.id },
          });
          assert.equal(lateEntries.length, 2);
          assert.equal(lateEntries.find((e) => e.kind === "CAPTURE")!.direction, "RECEIVED");
          assert.equal(lateEntries.find((e) => e.kind === "REFUND")!.direction, "SENT");
          await assert.rejects(backfillMerchant(tx, stranger.id, marker + "-latemerchant"));
          throw rollback;
        },
        { timeout: 90000 },
      ),
      (e) => e === rollback,
    );
    assert.equal(
      await db.user.count({ where: { id: marker } }),
      0,
      "test fixtures must not persist",
    );
  } finally {
    await db.$disconnect();
  }
});
