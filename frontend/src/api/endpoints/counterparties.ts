/**
 * counterpartiesService — контрагенты.
 *
 * Бэкенд: GET/POST/PUT/DELETE /api/counterparties и /api/counterparties/{id}
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { type Counterparty } from "../mocks/data/counterparties";
import { USE_MOCK } from "../../config";

let store: Counterparty[] = [];

const real = {
  getAll:  ()                                      => client.get<Counterparty[]>("/counterparties").then(r => r.data),
  create:  (data: Omit<Counterparty, "id">)        => client.post<Counterparty>("/counterparties", data).then(r => r.data),
  update:  (id: number, d: Partial<Counterparty>)  => client.put<Counterparty>(`/counterparties/${id}`, d).then(r => r.data),
  delete:  (id: number)                            => client.delete(`/counterparties/${id}`).then(r => r.data),
};

const mock = {
  getAll: () => delay([...store]),
  create: (data: Omit<Counterparty, "id">) => { const c = { ...data, id: randomId() } as Counterparty; store = [...store, c]; return delay(c); },
  update: (id: number, d: Partial<Counterparty>) => { store = store.map(c => c.id === id ? { ...c, ...d } : c); return delay(store.find(c => c.id === id)!); },
  delete: (id: number) => { store = store.filter(c => c.id !== id); return delay({ message: "OK" }); },
};

export const counterpartiesService = USE_MOCK ? mock : real;
