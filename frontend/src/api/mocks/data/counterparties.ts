/** Формат: Counterparty — совпадает с GET /api/counterparties */
export interface Counterparty {
  id:       number;
  name:     string;
  inn:      string;
  kpp?:     string;
  account?: string;  // расчётный счёт контрагента
  bank?:    string;
  bik?:     string;
  type:     "entity" | "individual";
  contact:  string;
}

export const mockCounterparties: Counterparty[] = [
  { id: 1, name: "ООО Поставщик Альфа", inn: "7701234567",   type: "entity",     contact: "Смирнов А.П."  },
  { id: 2, name: "ИП Смирнов А.В.",     inn: "772345678901", type: "individual", contact: "Смирнов А.В."  },
  { id: 3, name: "АО ТехСервис",        inn: "7803456789",   type: "entity",     contact: "Козлова Е.А."  },
  { id: 4, name: "ООО РентаГрупп",      inn: "7904567890",   type: "entity",     contact: "Петров И.С."   },
  { id: 5, name: "ПАО Энергоресурс",    inn: "7705678901",   type: "entity",     contact: "Васильев К.Д." },
  { id: 6, name: "ООО Альфа-Трейд",     inn: "7706789012",   type: "entity",     contact: "Николаев П.Р." },
  { id: 7, name: "ИП Коваленко Д.М.",   inn: "771789012301", type: "individual", contact: "Коваленко Д.М." },
];
