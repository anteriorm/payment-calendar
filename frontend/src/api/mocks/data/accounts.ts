/** Формат: Account — совпадает с GET /api/accounts */
export interface Account {
  id:         number;
  name:       string;
  type:       "bank" | "cash";
  currency:   string;
  opening:    number;
  current:    number;
  created_at?: string;
}

export const mockAccounts: Account[] = [
  { id: 1, name: "Расчётный счёт №1", type: "bank", currency: "RUB", opening: 50000000, current: 98000000, created_at: "01.01.2026" },
  { id: 2, name: "Расчётный счёт №2", type: "bank", currency: "USD", opening: 2200000,  current: 450000,  created_at: "15.02.2026" },
  { id: 3, name: "Касса",             type: "cash", currency: "RUB", opening: 5000000,  current: 1250000, created_at: "01.03.2026" },
];
