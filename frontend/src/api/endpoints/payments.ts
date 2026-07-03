import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockPayments, type Payment, type PaymentStatus } from "../mocks/data/payments";
import { USE_MOCK } from "../../config";
import { kopecksToRub, rubToKopecks } from "../../app/utils";

export interface PaymentsFilter {
  status?:          PaymentStatus;
  account_id?:      number;
  counterparty_id?: number;
  date_from?:       string;
  date_to?:         string;
}

// Интерфейс ответа бэкенда (с вложенными объектами)
interface ApiPayment {
  id: number;
  amount: number;                   // в копейках
  planned_date: string;
  account: { id: number; name: string };
  counterparty: { id: number; name: string };
  item: { id: number; name: string; type: string };
  purpose: string | null;
  priority: "high" | "medium" | "low";
  status: PaymentStatus;
  created_by: { id: number; name: string };
  registry_id: number | null;
  created_at: string;
  updated_at: string;
}

// Маппер: преобразует ответ бэкенда в формат, который ожидает фронт
function mapApiPayment(api: ApiPayment): Payment {
  return {
    id: api.id,
    amount: kopecksToRub(api.amount),          // копейки → рубли
    planned_date: api.planned_date,
    account_id: api.account.id,
    account_name: api.account.name,
    counterparty_id: api.counterparty.id,
    counterparty: api.counterparty.name,
    item_id: api.item.id,
    item: api.item.name,
    purpose: api.purpose || "",
    priority: api.priority,
    status: api.status,
    created_by: api.created_by.id,
    creator_name: api.created_by.name,
    registry_id: api.registry_id,
    created_at: api.created_at,
    updated_at: api.updated_at,
  };
}

// Интерфейс для создания/обновления (плоские поля, суммы в рублях)
export type PaymentCreateData = Omit<Payment, "id" | "status" | "created_at" | "updated_at">;

let store: Payment[] = [...mockPayments];

const real = {
  getAll: (f?: PaymentsFilter) =>
    client.get<ApiPayment[]>("/payments", { params: f })
      .then(r => r.data.map(mapApiPayment)),

  getOne: (id: number) =>
    client.get<ApiPayment>(`/payments/${id}`)
      .then(r => mapApiPayment(r.data)),

  create: (data: Omit<Payment, "id" | "status" | "created_at" | "updated_at">) => {
    // Конвертируем суммы в копейки и убираем строковые названия
    const payload = {
      amount: rubToKopecks(data.amount),
      planned_date: data.planned_date,
      account_id: data.account_id,
      counterparty_id: data.counterparty_id,
      item_id: data.item_id,
      purpose: data.purpose,
      priority: data.priority,
      // status не передаём, бэкенд установит draft по умолчанию
    };
    return client.post<ApiPayment>("/payments", payload)
      .then(r => mapApiPayment(r.data));
  },

  update: (id: number, data: Partial<Payment>) => {
    const payload: any = {};
    if (data.amount !== undefined) payload.amount = rubToKopecks(data.amount);
    if (data.planned_date !== undefined) payload.planned_date = data.planned_date;
    if (data.account_id !== undefined) payload.account_id = data.account_id;
    if (data.counterparty_id !== undefined) payload.counterparty_id = data.counterparty_id;
    if (data.item_id !== undefined) payload.item_id = data.item_id;
    if (data.purpose !== undefined) payload.purpose = data.purpose;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.status !== undefined) payload.status = data.status;
    return client.put<ApiPayment>(`/payments/${id}`, payload)
      .then(r => mapApiPayment(r.data));
  },

  delete: (id: number) => client.delete(`/payments/${id}`).then(r => r.data),

  submit: (id: number) =>
    client.post<ApiPayment>(`/payments/${id}/submit`)
      .then(r => mapApiPayment(r.data)),

  approve: (id: number) =>
    client.post<ApiPayment>(`/payments/${id}/approve`)
      .then(r => mapApiPayment(r.data)),

  reject: (id: number, comment: string) =>
    client.post<ApiPayment>(`/payments/${id}/reject`, { comment })
      .then(r => mapApiPayment(r.data)),

  move: (id: number, planned_date: string) =>
    client.post<ApiPayment>(`/payments/${id}/move`, { planned_date })
      .then(r => mapApiPayment(r.data)),
};

// ---------- Мок-реализация (без изменений, использует store) ----------
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