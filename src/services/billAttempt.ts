import type { BillAttempt } from "../types/bill";

// Persist the submission outcome across route changes/reloads; never automatically retry POST.
export const billAttemptKey = (userId: string, storeId: string) =>
  `franchise.bill-attempt:${userId.toLowerCase()}:${storeId.toLowerCase()}`;
export function readBillAttempt(key: string): BillAttempt | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as BillAttempt;
    if (
      value.status === "created" &&
      typeof value.billId === "string" &&
      /^[0-9a-f-]{36}$/i.test(value.billId)
    )
      return value;
    if (value.status === "pending") return value;
  } catch {
    /* Keep an ambiguous attempt blocked instead of silently permitting a retry. */
  }
  return { status: "pending", startedAt: "" };
}
export function writeBillAttempt(key: string, attempt: BillAttempt | null) {
  if (attempt) sessionStorage.setItem(key, JSON.stringify(attempt));
  else sessionStorage.removeItem(key);
}
