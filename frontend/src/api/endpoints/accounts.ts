/**
 * accountsService — счета и кассы.
 *
 * Бэкенд должен реализовать:
 *   GET    /api/accounts          → Account[]
 *   POST   /api/accounts          → Account
 *   PUT    /api/accounts/{id}     → Account
 *   DELETE /api/accounts/{id}     → { message: string }
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockAccounts, type Account } from "../mocks/data/accounts";
import { USE_MOCK } from "../../config";

// Мок-хранилище (сбрасывается при перезагрузке — это нормально для прототипа)
let store: Account[] = [...mockAccounts];

const real = {
  getAll: ()                          => client.get<Account[]>("/accounts").then(r => r.data),
  getOne: (id: number)                => client.get<Account>(`/accounts/${id}`).then(r => r.data),
  create: (data: Omit<Account, "id">) => client.post<Account>("/accounts", data).then(r => r.data),
  update: (id: number, data: Partial<Account>) => client.put<Account>(`/accounts/${id}`, data).then(r => r.data),
  delete: (id: number)                => client.delete(`/accounts/${id}`).then(r => r.data),
};

const mock = {
  getAll: ()                          => delay([...store]),
  getOne: (id: number)                => delay(store.find(a => a.id === id) ?? null),
  create: (data: Omit<Account, "id">) => {
    const created = { ...data, id: randomId() } as Account;
    store = [...store, created];
    return delay(created);
  },
  update: (id: number, data: Partial<Account>) => {
    store = store.map(a => a.id === id ? { ...a, ...data } : a);
    return delay(store.find(a => a.id === id)!);
  },
  delete: (id: number) => {
    store = store.filter(a => a.id !== id);
    return delay({ message: "Удалено" });
  },
};

export const accountsService = USE_MOCK ? mock : real;
