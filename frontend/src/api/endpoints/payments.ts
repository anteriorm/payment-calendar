/**
 * paymentsService — заявки на платёж.
 *
 * Бэкенд должен реализовать:
 *   GET    /api/payments                    → Payment[] (с фильтрами)
 *   POST   /api/payments                    → Payment
 *   PUT    /api/payments/{id}               → Payment
 *   DELETE /api/payments/{id}               → { message }
 *   POST   /api/payments/{id}/submit        → Payment (status → pending)
 *   POST   /api/payments/{id}/approve       → Payment (status → approved)
 *   POST   /api/payments/{id}/reject        → Payment (status → rejected)
 *   POST   /api/payments/{id}/move          → Payment (новая planned_date)
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockPayments, type Payment, type PaymentStatus } from "../mocks/data/payments";
import { USE_MOCK } from "../../config";

export interface PaymentsFilter {
  status?:          PaymentStatus;
  account_id?:      number;
  counterparty_id?: number;
  date_from?:       string;
  date_to?:         string;
}

let store: Payment[] = [...mockPayments];

const real = {
  getAll:   (f?: PaymentsFilter)                    => client.get<Payment[]>("/payments", { params: f }).then(r => r.data),
  getOne:   (id: number)                            => client.get<Payment>(`/payments/${id}`).then(r => r.data),
  create:   (data: Omit<Payment, "id" | "status" | "created_at">) => client.post<Payment>("/payments", data).then(r => r.data),
  update:   (id: number, data: Partial<Payment>)    => client.put<Payment>(`/payments/${id}`, data).then(r => r.data),
  delete:   (id: number)                            => client.delete(`/payments/${id}`).then(r => r.data),
  submit:   (id: number)                            => client.post<Payment>(`/payments/${id}/submit`).then(r => r.data),
  approve:  (id: number)                            => client.post<Payment>(`/payments/${id}/approve`).then(r => r.data),
  reject:   (id: number, comment: string)           => client.post<Payment>(`/payments/${id}/reject`, { comment }).then(r => r.data),
  move:     (id: number, planned_date: string)      => client.post<Payment>(`/payments/${id}/move`, { planned_date }).then(r => r.data),
};

const setStatus = (id: number, status: PaymentStatus): Payment => {
  store = store.map(p => p.id === id ? { ...p, status } : p);
  return store.find(p => p.id === id)!;
};

const mock = {
  getAll: (f?: PaymentsFilter) => {
    let result = [...store];
    if (f?.status)     result = result.filter(p => p.status === f.status);
    if (f?.account_id) result = result.filter(p => p.account_id === f.account_id);
    return delay(result);
  },
  getOne:  (id: number)  => delay(store.find(p => p.id === id) ?? null),
  create:  (data: Omit<Payment, "id" | "status" | "created_at">) => {
    const p: Payment = { ...data, id: randomId(), status: "draft", created_at: new Date().toISOString() } as Payment;
    store = [...store, p];
    return delay(p);
  },
  update:  (id: number, data: Partial<Payment>) => {
    store = store.map(p => p.id === id ? { ...p, ...data } : p);
    return delay(store.find(p => p.id === id)!);
  },
  delete:  (id: number) => { store = store.filter(p => p.id !== id); return delay({ message: "OK" }); },
  submit:  (id: number) => delay(setStatus(id, "pending")),
  approve: (id: number) => delay(setStatus(id, "approved")),
  reject:  (id: number, _comment: string) => delay(setStatus(id, "rejected")),
  move:    (id: number, planned_date: string) => {
    store = store.map(p => p.id === id ? { ...p, planned_date } : p);
    return delay(store.find(p => p.id === id)!);
  },
};

export const paymentsService = USE_MOCK ? mock : real;
