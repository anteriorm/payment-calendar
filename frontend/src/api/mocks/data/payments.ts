/** Формат: Payment (заявка на платёж) — совпадает с GET /api/payments */
export type PaymentStatus   = "draft" | "pending" | "approved" | "in_registry" | "paid" | "rejected";
export type PaymentPriority = "high" | "medium" | "low";

export interface Payment {
  id:              number;
  planned_date:    string;  // "YYYY-MM-DD"  (на фронте отображается как "дд.мм.гггг")
  account_id:      number;
  account_name:    string;
  counterparty_id: number;
  counterparty:    string;
  item_id:         number;
  item:            string;
  amount:          number;  // в копейках (минимальных единицах валюты)
  priority:        PaymentPriority;
  status:          PaymentStatus;
  purpose:         string;
  created_by:      string;
  created_at:      string;
}

export const mockPayments: Payment[] = [
  { id: 2843, planned_date: "2026-06-20", account_id: 2, account_name: "Расчётный счёт №2", counterparty_id: 3, counterparty: "ООО ТехСервис",       item_id: 4, item: "Услуги подрядчиков",  amount: 8500000,  priority: "medium", status: "draft",       purpose: "Разработка ПО",             created_by: "Иванова М.С.", created_at: "2026-06-20T09:00:00" },
  { id: 2844, planned_date: "2026-06-22", account_id: 1, account_name: "Расчётный счёт №1", counterparty_id: 2, counterparty: "ИП Смирнов А.В.",     item_id: 1, item: "Аренда",              amount: 4500000,  priority: "high",   status: "pending",     purpose: "Аренда склада",             created_by: "Иванова М.С.", created_at: "2026-06-21T11:00:00" },
  { id: 2845, planned_date: "2026-06-25", account_id: 1, account_name: "Расчётный счёт №1", counterparty_id: 4, counterparty: "ООО РентаГрупп",      item_id: 1, item: "Аренда офиса",        amount: 12000000, priority: "low",    status: "approved",    purpose: "Офис, июнь 2026",           created_by: "Иванова М.С.", created_at: "2026-06-22T14:00:00" },
  { id: 2846, planned_date: "2026-06-28", account_id: 2, account_name: "Расчётный счёт №2", counterparty_id: 5, counterparty: "АО ТехСервис",        item_id: 5, item: "Налоги и сборы",      amount: 34000000, priority: "high",   status: "in_registry", purpose: "НДС за Q2",                 created_by: "Иванова М.С.", created_at: "2026-06-23T10:00:00" },
  { id: 2847, planned_date: "2026-06-18", account_id: 3, account_name: "Касса",             counterparty_id: 1, counterparty: "ООО Поставщик Альфа", item_id: 3, item: "Расходные материалы", amount: 1250000,  priority: "low",    status: "paid",        purpose: "Канцелярия",                created_by: "Иванова М.С.", created_at: "2026-06-15T09:00:00" },
  { id: 2848, planned_date: "2026-06-15", account_id: 1, account_name: "Расчётный счёт №1", counterparty_id: 5, counterparty: "ПАО Энергоресурс",    item_id: 4, item: "Услуги подрядчиков",  amount: 9500000,  priority: "medium", status: "rejected",    purpose: "Управленческий консалтинг", created_by: "Иванова М.С.", created_at: "2026-06-14T16:00:00" },
];
