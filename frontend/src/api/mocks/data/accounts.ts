/** Формат: Account — совпадает с GET /api/accounts */
export interface Account {
  id:       number;
  name:     string;
  type:     "bank" | "cash";
  currency: string;
  opening:  number;  // в рублях (на бэке хранить в копейках)
  current:  number;
}

export const mockAccounts: Account[] = [
  { id: 1, name: "Расчётный счёт №1", type: "bank", currency: "RUB", opening: 50000000, current: 98000000  },
  { id: 2, name: "Расчётный счёт №2", type: "bank", currency: "RUB", opening: 20000000, current: 4500000  },
  { id: 3, name: "Касса",             type: "cash", currency: "RUB", opening: 5000000,  current: 1250000  },
];
