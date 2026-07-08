/**
 * Bank transfer details for meeting room payments.
 * Set in .env with VITE_ prefix (safe to show to guests after booking).
 */
export const paymentDetails = {
  accountName: import.meta.env.VITE_SPIRE_BANK_ACCOUNT_NAME ?? "SPIRE HUB W.L.L",
  iban: import.meta.env.VITE_SPIRE_BANK_IBAN ?? "",
  accountNumber: import.meta.env.VITE_SPIRE_BANK_ACCOUNT_NUMBER ?? "",
  bankName: import.meta.env.VITE_SPIRE_BANK_NAME ?? "Bahrain Islamic Bank",
  swift: import.meta.env.VITE_SPIRE_BANK_SWIFT ?? "BIBBBHBM",
  paymentDeadlineHours: Number(import.meta.env.VITE_SPIRE_PAYMENT_DEADLINE_HOURS ?? "24"),
};

export function hasPaymentDetails(): boolean {
  return Boolean(paymentDetails.iban);
}
