/**
 * @ssm/utils
 * Pure utility functions. No React, no side effects — fully testable.
 */

// ─── Currency Formatter ───────────────────────────────────────────────────────

/**
 * Format UGX amounts as compact strings for dashboard cards.
 * Examples:
 *   5_000_000  →  "UGX 5M"
 *   750_000    →  "UGX 750K"
 *   1_200_000  →  "UGX 1.2M"
 *   500        →  "UGX 500"
 */
export function formatUGX(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `UGX ${trimTrailingZero(v)}B`;
  }
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000;
    return `UGX ${trimTrailingZero(v)}M`;
  }
  if (amount >= 1_000) {
    const v = amount / 1_000;
    return `UGX ${trimTrailingZero(v)}K`;
  }
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

/**
 * Format UGX as a full raw integer string for edit forms and receipts.
 * Examples: 5000000 → "5,000,000"
 */
export function formatUGXRaw(amount: number): string {
  return amount.toLocaleString("en-UG");
}

function trimTrailingZero(n: number): string {
  return parseFloat(n.toFixed(1)).toString();
}

// ─── Phone normaliser ─────────────────────────────────────────────────────────
/** Convert 077XXXXXXX → +256 77X XXX XXX display format */
export function formatUgandaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+256 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-UG", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function currentAcademicTerm(): string {
  const month = new Date().getMonth() + 1; // 1-indexed
  if (month >= 2 && month <= 4)  return "Term 1";
  if (month >= 6 && month <= 8)  return "Term 2";
  if (month >= 10 && month <= 11) return "Term 3";
  return "Holiday";
}
