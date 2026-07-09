/**
 * calendarService — платёжный календарь.
 *
 * Бэкенд должен реализовать:
 *   GET /api/calendar?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&account_id=N
 *   → CalendarDay[]  (рассчитанные остатки по дням)
 *
 * ВАЖНО: расчёт остатков — задача бэкенда.
 * Фронт получает готовые данные и только рендерит их.
 */

import client from "../client";
import { delay } from "../mocks/handlers";
import { mockCalendarDays, type CalendarDay } from "../mocks/data/calendar";
import { USE_MOCK } from "../../config";

export interface CalendarFilter {
  start_date:       string;  // "YYYY-MM-DD"
  end_date:         string;
  account_id?:      number;
  item_id?:         number;
  counterparty_id?: number;
  income_status?:   "planned" | "confirmed" | "received";
}

const real = {
  get: (f: CalendarFilter) => client.get<CalendarDay[]>("/calendar", { params: f }).then(r => r.data),
};

const mock = {
  get: (_f: CalendarFilter) => {
    // Мок возвращает всегда одни и те же данные
    // Бэкенд должен фильтровать по датам и счёту
    return delay([...mockCalendarDays]);
  },
};

export const calendarService = USE_MOCK ? mock : real;
