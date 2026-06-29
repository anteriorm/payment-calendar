/**
 * Формат: CalendarDay — совпадает с GET /api/calendar
 * Бэкенд рассчитывает остатки по дням и отдаёт готовый массив.
 * Фронт только рендерит.
 */
export interface CalendarDay {
  date:             string;      // "YYYY-MM-DD"
  account_id:       number | null;  // null = сводная строка по всем счетам
  account_name:     string;
  opening_balance:  number;
  income_total:     number;
  expense_total:    number;
  closing_balance:  number;
  has_cash_gap:     boolean;     // closing_balance < 0
}

// Неделя 23-29 июня 2026, по каждому счёту + итоговая строка
export const mockCalendarDays: CalendarDay[] = [
  // 23 июня — позитивный
  { date: "2026-06-23", account_id: 1, account_name: "Расчётный №1", opening_balance: 94500000, income_total: 12000000, expense_total: 8500000,  closing_balance: 98000000,   has_cash_gap: false },
  { date: "2026-06-23", account_id: 2, account_name: "Расчётный №2", opening_balance: 2500000,  income_total: 6000000,  expense_total: 4000000,  closing_balance: 4500000,    has_cash_gap: false },
  { date: "2026-06-23", account_id: 3, account_name: "Касса",        opening_balance: 750000,   income_total: 1500000,  expense_total: 1000000,  closing_balance: 1250000,    has_cash_gap: false },
  { date: "2026-06-23", account_id: null, account_name: "Итого",     opening_balance: 97750000, income_total: 19500000, expense_total: 13500000, closing_balance: 103750000,  has_cash_gap: false },
  // 24 июня — кассовый разрыв
  { date: "2026-06-24", account_id: 1, account_name: "Расчётный №1", opening_balance: 98000000, income_total: 3000000,  expense_total: 22000000, closing_balance: 79000000,   has_cash_gap: false },
  { date: "2026-06-24", account_id: 2, account_name: "Расчётный №2", opening_balance: 4500000,  income_total: 1500000,  expense_total: 8000000,  closing_balance: -2000000,   has_cash_gap: true  },
  { date: "2026-06-24", account_id: 3, account_name: "Касса",        opening_balance: 1250000,  income_total: 500000,   expense_total: 2000000,  closing_balance: -250000,    has_cash_gap: true  },
  { date: "2026-06-24", account_id: null, account_name: "Итого",     opening_balance: 103750000,income_total: 5000000,  expense_total: 32000000, closing_balance: 76750000,   has_cash_gap: false },
];
