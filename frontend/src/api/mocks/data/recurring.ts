export type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringStatus   = "active" | "paused" | "completed";

export interface RecurringTemplate {
  id:              number;
  name:            string;
  counterparty:    string;
  article:         string;
  account:         string;
  amount:          number;              // в копейках
  frequency:       RecurringFrequency;
  start_date:      string;             // ISO date
  end_date?:       string;             // ISO date или undefined
  next_date:       string;             // ISO date — следующий запланированный платёж
  status:          RecurringStatus;
  last_created?:   string;             // ISO date — когда создан последний платёж
  created_count:   number;
  purpose:         string;
  priority:        "high" | "medium" | "low";
  created_by:      string;
}

export const mockRecurringTemplates: RecurringTemplate[] = [
  {
    id: 1,
    name: "Аренда офиса — ООО РентаГрупп",
    counterparty: "ООО РентаГрупп",
    article: "Аренда офиса",
    account: "Расчётный №1",
    amount: 12000000,
    frequency: "monthly",
    start_date: "2026-01-25",
    end_date: "2026-12-31",
    next_date: "2026-07-25",
    status: "active",
    last_created: "2026-06-25",
    created_count: 6,
    purpose: "Аренда офиса, ежемесячно",
    priority: "low",
    created_by: "Иванова М.С.",
  },
  {
    id: 2,
    name: "Зарплата — выплата сотрудникам",
    counterparty: "Выплаты сотрудникам",
    article: "Заработная плата",
    account: "Расчётный №1",
    amount: 58000000,
    frequency: "monthly",
    start_date: "2026-01-05",
    next_date: "2026-07-05",
    status: "active",
    last_created: "2026-06-05",
    created_count: 6,
    purpose: "Выплата заработной платы",
    priority: "high",
    created_by: "Иванова М.С.",
  },
  {
    id: 3,
    name: "НДС — квартальный платёж",
    counterparty: "АО ТехСервис",
    article: "Налоги и сборы",
    account: "Расчётный №2",
    amount: 34000000,
    frequency: "quarterly",
    start_date: "2026-03-28",
    next_date: "2026-09-28",
    status: "active",
    last_created: "2026-06-28",
    created_count: 2,
    purpose: "НДС за квартал",
    priority: "high",
    created_by: "Иванова М.С.",
  },
  {
    id: 4,
    name: "Расходные материалы — еженедельно",
    counterparty: "ООО Поставщик Альфа",
    article: "Расходные материалы",
    account: "Касса",
    amount: 1250000,
    frequency: "weekly",
    start_date: "2026-06-04",
    next_date: "2026-07-09",
    status: "paused",
    last_created: "2026-06-18",
    created_count: 3,
    purpose: "Канцелярия и расходники",
    priority: "low",
    created_by: "Иванова М.С.",
  },
  {
    id: 5,
    name: "Услуги ИП Смирнов — склад",
    counterparty: "ИП Смирнов А.В.",
    article: "Аренда",
    account: "Расчётный №1",
    amount: 4500000,
    frequency: "monthly",
    start_date: "2026-03-22",
    end_date: "2026-12-31",
    next_date: "2026-07-22",
    status: "active",
    last_created: "2026-06-22",
    created_count: 4,
    purpose: "Аренда склада",
    priority: "medium",
    created_by: "Иванова М.С.",
  },
];
