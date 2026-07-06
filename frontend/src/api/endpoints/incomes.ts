/**
 * incomesService — плановые поступления.
 *
 * Бэкенд должен реализовать:
 *   GET    /api/incomes               → Income[]
 *   POST   /api/incomes               → Income
 *   PUT    /api/incomes/{id}          → Income
 *   DELETE /api/incomes/{id}          → { message }
 *   POST   /api/incomes/{id}/received → Income (status → received)
 *   POST   /api/incomes/{id}/cancel   → Income (status → canceled)
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockIncomes, type Income, type IncomeStatus } from "../mocks/data/incomes";
import { USE_MOCK } from "../../config";

let store: Income[] = [...mockIncomes];

const real = {
  getAll:        ()                                         => client.get<Income[]>("/incomes").then(r => r.data),
  create:        (data: Omit<Income, "id">)                 => client.post<Income>("/incomes", data).then(r => r.data),
  update:        (id: number, data: Partial<Income>)        => client.put<Income>(`/incomes/${id}`, data).then(r => r.data),
  delete:        (id: number)                               => client.delete(`/incomes/${id}`).then(r => r.data),
  markConfirmed: (id: number)                               => client.post<Income>(`/incomes/${id}/confirmed`).then(r => r.data),
  markReceived:  (id: number)                               => client.post<Income>(`/incomes/${id}/received`).then(r => r.data),
  cancel:        (id: number)                               => client.post<Income>(`/incomes/${id}/cancel`).then(r => r.data),
  import:        (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post<{ message: string; imported: number; errors: string[] }>("/import/incomes", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
};

const setStatus = (id: number, s: IncomeStatus) => {
  store = store.map(i => i.id === id ? { ...i, status: s } : i);
  return store.find(i => i.id === id)!;
};

const mock = {
  getAll: () => delay([...store]),
  create: (data: Omit<Income, "id">) => {
    const item: Income = { ...data, id: randomId() };
    store = [...store, item];
    return delay(item);
  },
  update: (id: number, data: Partial<Income>) => {
    store = store.map(i => i.id === id ? { ...i, ...data } : i);
    return delay(store.find(i => i.id === id)!);
  },
  delete:       (id: number) => { store = store.filter(i => i.id !== id); return delay({ message: "OK" }); },
  markConfirmed:(id: number) => delay(setStatus(id, "confirmed")),
  markReceived: (id: number) => delay(setStatus(id, "received")),
  cancel:       (id: number) => delay(setStatus(id, "canceled")),
  import:       (file: File) => delay({ message: "Импорт недоступен в режиме моков", imported: 0, errors: [] }),
};

export const incomesService = USE_MOCK ? mock : real;
