export interface Currency {
  code:        string;
  symbol:      string;
  name:        string;
  rate_to_rub: number;
  updated_at:  string;
}

export let mockCurrencies: Currency[] = [
  { code: "RUB", symbol: "₽", name: "Российский рубль", rate_to_rub: 1,      updated_at: "02.07.2026" },
  { code: "USD", symbol: "$", name: "Доллар США",        rate_to_rub: 89.50,  updated_at: "02.07.2026" },
  { code: "EUR", symbol: "€", name: "Евро",              rate_to_rub: 97.20,  updated_at: "02.07.2026" },
  { code: "AMD", symbol: "֏", name: "Армянский драм",    rate_to_rub: 0.24,   updated_at: "02.07.2026" },
];
