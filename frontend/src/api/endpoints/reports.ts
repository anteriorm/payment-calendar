/**
 * reportsService — отчёты.
 *
 * Бэкенд должен реализовать:
 *   GET /api/reports/balances    → BalanceRow[]
 *   GET /api/reports/cash-gaps   → CashGapRow[]
 *   GET /api/reports/plan-fact   → PlanFactRow[]
 *   GET /api/reports/balances/export   → CSV
 *   GET /api/reports/cash-gaps/export  → CSV
 */

import client from "../client";
import { delay } from "../mocks/handlers";
import { USE_MOCK } from "../../config";

export interface ReportsFilter { date_from: string; date_to: string; account_id?: number; }

export interface BalanceRow    { account: string; opening: number; income: number; expense: number; closing: number; is_total?: boolean; }
export interface CashGapRow    { date: string; account: string; deficit: number; top_payer: string; top_amount: number; }
export interface PlanFactRow   { period: string; item: string; budget: number; fact: number; }

const mockBalances: BalanceRow[] = [
  { account: "Расчётный счёт №1", opening: 85000000,  income: 55500000, expense: 82000000,  closing: 58500000  },
  { account: "Расчётный счёт №2", opening: 31000000,  income: 28000000, expense: 42000000,  closing: 17000000  },
  { account: "Касса",             opening: 8500000,   income: 6600000,  expense: 7600000,   closing: 7500000   },
  { account: "Итого",             opening: 124500000, income: 90100000, expense: 131600000, closing: 83000000, is_total: true },
];

const mockCashGaps: CashGapRow[] = [
  { date: "28 мая 2026",  account: "Расчётный счёт №2",            deficit: -9500000,  top_payer: "ООО РентаГрупп",  top_amount: 15000000 },
  { date: "24 июня 2026", account: "Расчётный №1, №2, Касса",      deficit: -27000000, top_payer: "ООО ТехСервис",   top_amount: 22000000 },
  { date: "27 июня 2026", account: "Расчётный №1, №2",             deficit: -24000000, top_payer: "ИП Смирнов А.В.", top_amount: 18000000 },
  { date: "29 июня 2026", account: "Расчётный №2, Касса",          deficit: -8500000,  top_payer: "АО ТехСервис",    top_amount: 9500000  },
];

const mockPlanFact: PlanFactRow[] = [
  { period: "Июнь 2026", item: "Аренда офиса",        budget: 12000000, fact: 12000000 },
  { period: "Июнь 2026", item: "Заработная плата",     budget: 58000000, fact: 56000000 },
  { period: "Июнь 2026", item: "Расходные материалы",  budget: 3000000,  fact: 1250000  },
  { period: "Июнь 2026", item: "Услуги подрядчиков",   budget: 15000000, fact: 18000000 },
  { period: "Июнь 2026", item: "Налоги и сборы",       budget: 34000000, fact: 34000000 },
];

const real = {
  getBalances:  (f: ReportsFilter) => client.get<BalanceRow[]>("/reports/balances", { params: f }).then(r => r.data),
  getCashGaps:  (f: ReportsFilter) => client.get<CashGapRow[]>("/reports/cash-gaps", { params: f }).then(r => r.data),
  getPlanFact:  (f: ReportsFilter) => client.get<PlanFactRow[]>("/reports/plan-fact", { params: f }).then(r => r.data),
  exportBalances: (f: ReportsFilter) => client.get("/reports/balances/export", { params: f, responseType: "blob" }).then(r => r.data),
  exportCashGaps: (f: ReportsFilter) => client.get("/reports/cash-gaps/export", { params: f, responseType: "blob" }).then(r => r.data),
};

const mock = {
  getBalances:    (_f?: ReportsFilter) => delay([...mockBalances]),
  getCashGaps:    (_f?: ReportsFilter) => delay([...mockCashGaps]),
  getPlanFact:    (_f?: ReportsFilter) => delay([...mockPlanFact]),
  exportBalances: (_f?: ReportsFilter) => delay(new Blob([], { type: "text/csv" })),
  exportCashGaps: (_f?: ReportsFilter) => delay(new Blob([], { type: "text/csv" })),
};

export const reportsService = USE_MOCK ? mock : real;
