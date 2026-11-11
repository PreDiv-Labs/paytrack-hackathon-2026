export function canCollectSharedExpenses(
  payerId: string | null | undefined,
  merchantId: string | null | undefined,
) {
  return !!payerId && !!merchantId && payerId === merchantId;
}
