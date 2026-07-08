/**
 * Формат: CalendarDay — совпадает с GET /api/calendar
 */
export interface CalendarDay {
  date:             string;
  account_id:       number | null;
  account_name:     string;
  opening_balance:  number;
  income_total:     number;
  expense_total:    number;
  closing_balance:  number;
  has_cash_gap:     boolean;
  description?:     string;
}

export const mockCalendarDays: CalendarDay[] = [];
