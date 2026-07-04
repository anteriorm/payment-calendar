/**
 * recurringService — повторяющиеся платежи (шаблоны).
 *
 * Бэкенд должен реализовать:
 *   GET    /api/recurring                     → RecurringTemplate[]
 *   POST   /api/recurring                     → RecurringTemplate
 *   PUT    /api/recurring/{id}                → RecurringTemplate
 *   DELETE /api/recurring/{id}                → { message }
 *   POST   /api/recurring/{id}/pause          → RecurringTemplate (status → paused)
 *   POST   /api/recurring/{id}/resume         → RecurringTemplate (status → active)
 *   POST   /api/recurring/{id}/generate       → Payment (создаёт черновик из шаблона)
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockRecurringTemplates, type RecurringTemplate, type RecurringFrequency } from "../mocks/data/recurring";
import { USE_MOCK } from "../../config";

export interface CreateRecurringData {
  name:          string;
  counterparty:  string;
  article:       string;
  account:       string;
  amount:        number;
  frequency:     RecurringFrequency;
  start_date:    string;
  end_date?:     string;
  purpose:       string;
  priority:      "high" | "medium" | "low";
}

let store: RecurringTemplate[] = [...mockRecurringTemplates];

const real = {
  getAll:   ()                               => client.get<RecurringTemplate[]>("/recurring").then(r => r.data),
  create:   (data: CreateRecurringData)      => client.post<RecurringTemplate>("/recurring", data).then(r => r.data),
  update:   (id: number, data: Partial<RecurringTemplate>) => client.put<RecurringTemplate>(`/recurring/${id}`, data).then(r => r.data),
  delete:   (id: number)                     => client.delete(`/recurring/${id}`).then(r => r.data),
  pause:    (id: number)                     => client.post<RecurringTemplate>(`/recurring/${id}/pause`).then(r => r.data),
  resume:   (id: number)                     => client.post<RecurringTemplate>(`/recurring/${id}/resume`).then(r => r.data),
  generate: (id: number)                     => client.post(`/recurring/${id}/generate`).then(r => r.data),
};

const mock = {
  getAll: () => delay([...store]),
  create: (data: CreateRecurringData) => {
    const t: RecurringTemplate = {
      ...data,
      id:            randomId(),
      next_date:     data.start_date,
      status:        "active",
      created_count: 0,
      created_by:    "Иванова М.С.",
    };
    store = [...store, t];
    return delay(t);
  },
  update: (id: number, data: Partial<RecurringTemplate>) => {
    store = store.map(t => t.id === id ? { ...t, ...data } : t);
    return delay(store.find(t => t.id === id)!);
  },
  delete: (id: number) => { store = store.filter(t => t.id !== id); return delay({ message: "OK" }); },
  pause:  (id: number) => {
    store = store.map(t => t.id === id ? { ...t, status: "paused" } : t);
    return delay(store.find(t => t.id === id)!);
  },
  resume: (id: number) => {
    store = store.map(t => t.id === id ? { ...t, status: "active" } : t);
    return delay(store.find(t => t.id === id)!);
  },
  generate: (id: number) => {
    const t = store.find(t => t.id === id);
    if (!t) return delay({ message: "Not found" });
    store = store.map(s => s.id === id ? { ...s, last_created: t.next_date, created_count: s.created_count + 1 } : s);
    return delay({ message: "Черновик платежа создан", template_id: id });
  },
};

export const recurringService = USE_MOCK ? mock : real;
export type { RecurringTemplate, RecurringFrequency };
