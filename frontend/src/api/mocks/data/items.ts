/** Формат: Item (статья движения) — совпадает с GET /api/items */
export interface Item {
  id:    number;
  code:  string;
  name:  string;
  type:  "payment" | "income";  // payment=расход, income=приход
  group: string;
}

export const mockItems: Item[] = [
  { id: 1, code: "01.01", name: "Аренда офиса",         type: "payment", group: "Административные"    },
  { id: 2, code: "01.02", name: "Заработная плата",      type: "payment", group: "Оплата труда"        },
  { id: 3, code: "01.03", name: "Расходные материалы",   type: "payment", group: "Административные"    },
  { id: 4, code: "01.04", name: "Услуги подрядчиков",    type: "payment", group: "Операционные"        },
  { id: 5, code: "01.05", name: "Налоги и сборы",        type: "payment", group: "Налоги"              },
  { id: 6, code: "02.01", name: "Выручка от клиентов",   type: "income",  group: "Основная деятельность" },
  { id: 7, code: "02.02", name: "Прочие доходы",         type: "income",  group: "Прочие"              },
];
