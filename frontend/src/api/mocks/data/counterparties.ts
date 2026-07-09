/** Формат: Counterparty — совпадает с GET /api/counterparties */
export interface Counterparty {
  id:       number;
  name:     string;
  inn:      string;
  kpp?:     string;
  account?: string;  // расчётный счёт контрагента
  bank?:    string;
  bik?:     string;
  type:     "entity" | "individual" | "self_employed";
  contact:  string;
}
