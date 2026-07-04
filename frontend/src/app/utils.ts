// Multi-currency utilities
//
// CURRENCY_SYMBOLS - ISO 4217 currency symbols
// ACCOUNT_CURRENCY - dynamic map "account name -> currency code"
//   Updated at runtime via registerAccountCurrency() when accounts are created/edited.
//
// formatAmount(amount, currency):
//   Symbol always AFTER the number (Russian convention): "85 000 $", "85 000 EUR"

export const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: "₽", // ₽
  USD: "$",
  EUR: "€", // €
  CNY: "¥", // ¥
};

export const ACCOUNT_CURRENCY: Record<string, string> = {
  // Short forms (used in PaymentRequests, Income, RecurringPayments)
  "Расчётный №1": "RUB",
  "Расчётный №2": "USD",
  "Касса": "RUB",
  // Full forms (used in PaymentRegistry - "Расчётный счёт №2")
  "Расчётный счёт №1": "RUB",
  "Расчётный счёт №2": "USD",
};

/**
 * Registers an account's currency dynamically.
 * Call this from References when creating or editing an account.
 * Both short form ("Расчётный №2") and full form ("Расчётный счёт №2") are registered.
 */
export function registerAccountCurrency(name: string, currency: string): void {
  ACCOUNT_CURRENCY[name] = currency;
  const short = name.replace(/\s*счёт\s*/i, " ").replace(/\s+/g, " ").trim();
  const full  = name.includes("счёт") ? name : name.replace("Расчётный", "Расчётный счёт");
  if (short !== name) ACCOUNT_CURRENCY[short] = currency;
  if (full  !== name) ACCOUNT_CURRENCY[full]  = currency;
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? "₽";
}

export function getAccountCurrency(accountName: string): string {
  if (ACCOUNT_CURRENCY[accountName]) return ACCOUNT_CURRENCY[accountName];
  // Normalize: "Расчётный счёт №2" → "Расчётный №2"
  const normalized = accountName.replace(/\s*счёт\s*/i, " ").replace(/\s+/g, " ").trim();
  return ACCOUNT_CURRENCY[normalized] ?? "RUB";
}

/**
 * Formats an integer amount with currency symbol.
 * Symbol always AFTER the number (Russian convention):
 *   85000 + "RUB" → "85 000 ₽"
 *   85000 + "USD" → "85 000 $"
 *   85000 + "EUR" → "85 000 €"
 */
export function formatAmount(amount: number, currency: string): string {
  const s = Math.floor(Math.abs(amount)).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  const fmt = parts.join(" "); // non-breaking space
  const sym = CURRENCY_SYMBOLS[currency] ?? "₽";
  return `${fmt} ${sym}`;
}

/** Converts amount to RUB using provided exchange rates */
export function toRub(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === "RUB") return amount;
  return Math.round(amount * (rates[currency] ?? 1));
}

/**
 * Downloads data as a UTF-8 BOM CSV file (opens correctly in Russian Excel).
 * Uses semicolons as field separators — required for Russian locale where
 * comma is the decimal separator.
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const SEP = ";";
  const esc = (v: string | number) => {
    const s = String(v);
    return s.includes(SEP) || s.includes('"') || s.includes("\n")
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const csv =
    "﻿" + // UTF-8 BOM — Excel on Windows needs this for Cyrillic
    [headers, ...rows].map(r => r.map(esc).join(SEP)).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/** Formats an integer with Russian thousands separator: 195000 → "195 000" */
export function ruFmt(n: number): string {
  const s = Math.floor(Math.abs(n)).toString();
  const p: string[] = [];
  for (let i = s.length; i > 0; i -= 3) p.unshift(s.slice(Math.max(0, i - 3), i));
  return p.join(" "); // non-breaking space
}

export const fmtAmt     = (n: number) => ruFmt(n) + " ₽";
export const fmtBalance = (n: number) => (n < 0 ? "−" : "") + fmtAmt(n);

// Kopeck conversion utilities
// Backend stores and transmits ALL amounts in KOPECKS (integer).
// Frontend displays in rubles, sends in kopecks.
//
// Examples:
//   rubToKopecks("1 500,50")  → 150050
//   rubToKopecks(85000)       → 8500000
//   kopecksToRub(8500000)     → 85000
//   formatRub(8500000)        → "85 000,00 ₽"

/** Rubles (string or number) to kopecks. Safe for spaces and comma decimal. */
export function rubToKopecks(rub: string | number): number {
  const clean = typeof rub === "string"
    ? rub.replace(/\s/g, "").replace(",", ".")
    : String(rub);
  const n = parseFloat(clean);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Kopecks to rubles (number). */
export function kopecksToRub(kopecks: number): number {
  return kopecks / 100;
}

/**
 * Formats KOPECKS as "1 500,50 ₽".
 * Used throughout tables and cards.
 */
export function formatRub(kopecks: number): string {
  const abs  = Math.abs(kopecks) / 100;
  const [int, dec] = abs.toFixed(2).split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const result = `${intFmt},${dec} ₽`;
  return kopecks < 0 ? `−${result}` : result;
}

/**
 * Formats RUBLES (number) as "1 500,50 ₽".
 * For legacy components where data is already in rubles.
 */
export function formatRubFromRub(rub: number): string {
  return formatRub(Math.round(rub * 100));
}
