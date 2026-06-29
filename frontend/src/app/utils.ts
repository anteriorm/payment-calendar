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

export const fmtAmt     = (n: number) => ruFmt(n) + " ₽";
export const fmtBalance = (n: number) => (n < 0 ? "−" : "") + fmtAmt(n);

/* ── Конвертация рублей ↔ копейки ─────────────────────────────────────
 *
 * Бэкенд хранит и передаёт ВСЕ суммы в КОПЕЙКАХ (целое число).
 * Фронтенд отображает в рублях, отправляет в копейках.
 *
 * Примеры:
 *   rubToKopecks("1 500,50")  → 150050
 *   rubToKopecks(85000)       → 8500000
 *   kopecksToRub(8500000)     → 85000
 *   formatRub(8500000)        → "85 000,00 ₽"
 * ─────────────────────────────────────────────────────────────────── */

/** Рубли (строка или число) → копейки. Безопасно к пробелам и запятой. */
export function rubToKopecks(rub: string | number): number {
  const clean = typeof rub === "string"
    ? rub.replace(/\s/g, "").replace(",", ".")
    : String(rub);
  const n = parseFloat(clean);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Копейки → рубли (число). */
export function kopecksToRub(kopecks: number): number {
  return kopecks / 100;
}

/**
 * Форматирует КОПЕЙКИ как строку вида "1 500,50 ₽".
 * Используется везде в таблицах и карточках.
 */
export function formatRub(kopecks: number): string {
  const abs  = Math.abs(kopecks) / 100;
  const [int, dec] = abs.toFixed(2).split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");  // non-breaking space
  const result = `${intFmt},${dec}\u00a0\u20bd`;  // ₽ symbol
  return kopecks < 0 ? `\u2212${result}` : result;  // − sign
}

/**
 * Форматирует РУБЛИ (число) как строку вида "1 500,50 ₽".
 * Для legacy-компонентов, где данные уже в рублях.
 */
export function formatRubFromRub(rub: number): string {
  return formatRub(Math.round(rub * 100));
}
