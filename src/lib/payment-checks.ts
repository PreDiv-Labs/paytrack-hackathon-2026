import { toMinor } from "./money";
type Expected = {
  orderId: string | null;
  amountMinor: number;
  currency: string;
  merchantId: string | null;
  payerId: string | null;
  captureId: string | null;
};
type Result = {
  id: string;
  status: string;
  payer?: { payer_id?: string };
  payment_source?: { paypal?: { account_id?: string } };
  purchase_units: {
    custom_id?: string;
    payee?: { merchant_id?: string };
    payments?: {
      captures?: {
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
        create_time?: string;
      }[];
    };
  }[];
};
export function validateCapture(payment: Expected, order: Result, paymentId: string) {
  if (order.id !== payment.orderId || order.purchase_units.length !== 1)
    throw new Error("Order identity mismatch.");
  const unit = order.purchase_units[0],
    captures = unit.payments?.captures ?? [];
  const payerId = order.payer?.payer_id ?? order.payment_source?.paypal?.account_id;
  if (!payment.payerId || payerId !== payment.payerId)
    throw new Error("The approving PayPal account does not match the verified signed-in payer.");
  if (
    !payment.merchantId ||
    unit.payee?.merchant_id !== payment.merchantId ||
    unit.custom_id !== paymentId
  )
    throw new Error("Merchant or internal reference mismatch.");
  if (
    captures.length !== 1 ||
    !["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(captures[0].status) ||
    order.status !== "COMPLETED"
  )
    throw new Error("Payment has not been captured completely.");
  const capture = captures[0];
  if (
    toMinor(capture.amount.value) !== payment.amountMinor ||
    capture.amount.currency_code !== payment.currency
  )
    throw new Error("Capture amount or currency mismatch.");
  if (payment.captureId && payment.captureId !== capture.id)
    throw new Error("Conflicting capture reference.");
  return {
    captureId: capture.id,
    payerId,
    merchantId: payment.merchantId,
    occurredAt: capture.create_time ? new Date(capture.create_time) : new Date(),
  };
}
