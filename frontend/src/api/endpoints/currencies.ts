/**
 * currenciesService — справочник валют и курсов.
 *
 * Бэкенд должен реализовать:
 *   GET  /api/currencies                     → Currency[]
 *   PUT  /api/currencies/{code}/rate         → Currency (обновить курс)
 */

import client from "../client";
import { delay } from "../mocks/handlers";
import { mockCurrencies, type Currency } from "../mocks/data/currencies";
import { USE_MOCK } from "../../config";

let store: Currency[] = [...mockCurrencies];

const real = {
  getAll:     ()                                    => client.get<Currency[]>("/currencies").then(r => r.data),
  updateRate: (code: string, rate_to_rub: number)  => client.put<Currency>(`/currencies/${code}/rate`, { rate_to_rub }).then(r => r.data),
};

const mock = {
  getAll:     ()                                    => delay([...store]),
  updateRate: (code: string, rate_to_rub: number)  => {
    store = store.map(c => c.code === code ? { ...c, rate_to_rub, updated_at: "02.07.2026" } : c);
    return delay(store.find(c => c.code === code)!);
  },
};

export const currenciesService = USE_MOCK ? mock : real;
export type { Currency };
