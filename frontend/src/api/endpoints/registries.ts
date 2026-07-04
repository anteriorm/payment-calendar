/**
 * registriesService — реестры платежей.
 *
 * Бэкенд должен реализовать:
 *   GET  /api/registries           → Registry[]
 *   POST /api/registries           → Registry  (body: { registry_date, payment_ids })
 *   GET  /api/registries/{id}      → Registry
 *   POST /api/registries/{id}/pay  → Registry  (status → paid, все платежи → paid)
 *   GET  /api/registries/{id}/export → CSV-файл
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { USE_MOCK } from "../../config";

export type RegistryStatus = "draft" | "approved" | "paid" | "canceled";

export interface Registry {
  id:            number;
  registry_date: string;
  status:        RegistryStatus;
  payment_ids:   number[];
  total_amount:  number;
  created_by:    string;
  approved_by?:  string;
  created_at:    string;
}

let store: Registry[] = [
  { id: 1, registry_date: "2026-06-18", status: "paid",  payment_ids: [2845, 2846, 2841, 2842, 2847], total_amount: 124000000, created_by: "Петров И.А.", approved_by: "Козлова Е.В.", created_at: "2026-06-18T10:00:00" },
  { id: 2, registry_date: "2026-06-25", status: "draft", payment_ids: [2843, 2844],                   total_amount: 13000000,  created_by: "Петров И.А.", created_at: "2026-06-25T09:00:00" },
];

const real = {
  getAll:  ()                                         => client.get<Registry[]>("/registries").then(r => r.data),
  getOne:  (id: number)                               => client.get<Registry>(`/registries/${id}`).then(r => r.data),
  create:  (data: { registry_date: string; payment_ids: number[] }) => client.post<Registry>("/registries", data).then(r => r.data),
  pay:     (id: number)                               => client.post<Registry>(`/registries/${id}/pay`).then(r => r.data),
  export:  (id: number)                               => client.get(`/registries/${id}/export`, { responseType: "blob" }).then(r => r.data),
};

const mock = {
  getAll:  ()      => delay([...store]),
  getOne:  (id: number) => delay(store.find(r => r.id === id) ?? null),
  create:  (data: { registry_date: string; payment_ids: number[] }) => {
    const reg: Registry = { id: randomId(), ...data, status: "draft", total_amount: 0, created_by: "Петров И.А.", created_at: new Date().toISOString() };
    store = [...store, reg];
    return delay(reg);
  },
  pay: (id: number) => {
    store = store.map(r => r.id === id ? { ...r, status: "paid" as RegistryStatus } : r);
    return delay(store.find(r => r.id === id)!);
  },
  export: (id: number) => client.get(`/registries/${id}/export`, { responseType: 'blob' }).then(r => r.data),
};

export const registriesService = USE_MOCK ? mock : real;
