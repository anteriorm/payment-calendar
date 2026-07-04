export interface Currency {
  code:        string;  // "RUB", "USD", "EUR", "CNY"
  symbol:      string;  // "₽", "$", "€", "¥"
  name:        string;
  rate_to_rub: number;  // курс к RUB (1 единица валюты = N рублей)
  updated_at:  string;
}

export let mockCurrencies: Currency[] = [
  { code: "RUB", symbol: "₽", name: "Российский рубль", rate_to_rub: 1,      updated_at: "02.07.2026" },
  { code: "USD", symbol: "$", name: "Доллар США",        rate_to_rub: 89.50,  updated_at: "02.07.2026" },
  { code: "EUR", symbol: "€", name: "Евро",              rate_to_rub: 97.20,  updated_at: "02.07.2026" },
  { code: "CNY", symbol: "¥", name: "Китайский юань",    rate_to_rub: 12.35,  updated_at: "02.07.2026" },
];
