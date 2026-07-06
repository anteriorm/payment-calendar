/** Формат: Income (поступление) — совпадает с GET /api/incomes */
export type IncomeStatus = "planned" | "confirmed" | "received" | "canceled";

export interface Income {
  id:              number;
  planned_date:    string;
  account_id:      number;
  account_name:    string;
  counterparty_id: number;
  counterparty:    string;
  item_id:         number;
  item:            string;
  amount:          number;
  status:          IncomeStatus;
  purpose:         string;
  created_by:      string;
}

export const mockIncomes: Income[] = [
  { id: 2303, planned_date: "2026-06-30", account_id: 3, account_name: "Касса",             counterparty_id: 5, counterparty: "ПАО Инвестбанк",    item_id: 7, item: "Прочие доходы",       amount: 3200000,  status: "planned",   purpose: "Проценты по депозиту",   created_by: "Иванова М.С." },
  { id: 2302, planned_date: "2026-06-26", account_id: 2, account_name: "Расчётный счёт №2", counterparty_id: 7, counterparty: "ИП Коваленко Д.М.", item_id: 7, item: "Прочие доходы",       amount: 4500000,  status: "planned",   purpose: "Возврат переплаты",      created_by: "Иванова М.С." },
  { id: 2301, planned_date: "2026-06-25", account_id: 1, account_name: "Расчётный счёт №1", counterparty_id: 6, counterparty: "ООО Альфа-Трейд",   item_id: 6, item: "Выручка от клиентов", amount: 28000000, status: "confirmed", purpose: "Оплата за услуги июнь",  created_by: "Иванова М.С." },
  { id: 2300, planned_date: "2026-06-20", account_id: 1, account_name: "Расчётный счёт №1", counterparty_id: 3, counterparty: "АО СтройГрупп",    item_id: 6, item: "Выручка от клиентов", amount: 65000000, status: "received",  purpose: "Аванс по договору №12",  created_by: "Иванова М.С." },
  { id: 2299, planned_date: "2026-06-18", account_id: 2, account_name: "Расчётный счёт №2", counterparty_id: 4, counterparty: "ООО ЛогистикПро",  item_id: 6, item: "Выручка от клиентов", amount: 12000000, status: "received",  purpose: "Оплата счёта № 145",     created_by: "Иванова М.С." },
];
