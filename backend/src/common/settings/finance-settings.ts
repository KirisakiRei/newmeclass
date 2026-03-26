export const MIN_PREMIUM_PRICE = 99000;
export const DEFAULT_DEV_FEE_PERCENT = 5;

export function resolveCanonicalPaymentAmount(source: Record<string, any> | null | undefined) {
  const candidate = Number(source?.paymentAmount ?? source?.testPrice ?? MIN_PREMIUM_PRICE);
  return Math.max(Number.isFinite(candidate) ? candidate : MIN_PREMIUM_PRICE, MIN_PREMIUM_PRICE);
}

export function resolveCanonicalDevFeePercent(source: Record<string, any> | null | undefined) {
  const candidate = Number(source?.devFeePercent ?? DEFAULT_DEV_FEE_PERCENT);
  return Math.max(Number.isFinite(candidate) ? candidate : DEFAULT_DEV_FEE_PERCENT, 0);
}
