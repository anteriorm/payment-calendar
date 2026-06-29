/**
 * Переиспользуемые правила валидации форм.
 * Каждая функция возвращает строку-ошибку или null (если ок).
 *
 * Использование:
 *   const e = required(value) ?? positiveAmount(value);
 *   if (e) setError(e);
 */

/** Не пустое поле */
export const required = (v: string | undefined | null, label = "Обязательное поле"): string | null =>
  v?.trim() ? null : label;

/** Email формат */
export const email = (v: string): string | null =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
    ? null
    : "Некорректный email";

/** Сумма > 0 (принимает строку или число) */
export const positiveAmount = (v: string | number): string | null => {
  const n = typeof v === "number"
    ? v
    : parseFloat(String(v).replace(/[\s]/g, "").replace(",", "."));
  if (isNaN(n)) return "Введите число";
  if (n <= 0)   return "Сумма должна быть больше 0";
  return null;
};

/** Формат даты дд.мм.гггг */
export const dateRu = (v: string): string | null => {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(v)) return "Формат: дд.мм.гггг";
  const [d, m, y] = v.split(".").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d)
    return "Некорректная дата";
  return null;
};

/** ИНН — 10 или 12 цифр */
export const inn = (v: string): string | null => {
  const digits = v.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 12) return "ИНН: 10 или 12 цифр";
  return null;
};

/** Минимальная длина */
export const minLen = (n: number, v: string): string | null =>
  v.length >= n ? null : `Минимум ${n} символов`;

/** Число ≥ 0 */
export const nonNegative = (v: string): string | null => {
  const n = parseFloat(v.replace(",", "."));
  if (isNaN(n)) return "Введите число";
  if (n < 0)   return "Значение не может быть отрицательным";
  return null;
};

/** Подтверждение пароля */
export const passwordMatch = (password: string, confirm: string): string | null =>
  password === confirm ? null : "Пароли не совпадают";

/** Пароль — минимум 6 символов */
export const passwordStrength = (v: string): string | null =>
  v.length >= 6 ? null : "Пароль: минимум 6 символов";

/** Логин — только буквы, цифры, точки, дефисы */
export const loginFormat = (v: string): string | null =>
  /^[\w.\-@]+$/.test(v) ? null : "Логин: только буквы, цифры, ., -, @";

/**
 * Запускает набор правил и возвращает первую ошибку (или null).
 * Пример: firstError(required(name), minLen(2, name))
 */
export const firstError = (...results: (string | null)[]): string | null =>
  results.find(r => r !== null) ?? null;
