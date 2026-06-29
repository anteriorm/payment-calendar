/**
 * auditService — журнал действий (только Admin).
 *
 * Бэкенд должен реализовать:
 *   GET /api/audit?user=&action=&from=&to=&page=&per_page= → { data: AuditEntry[], total: number }
 */

import client from "../client";
import { delay } from "../mocks/handlers";
import { USE_MOCK } from "../../config";

export interface AuditEntry {
  id:         number;
  timestamp:  string;  // "YYYY-MM-DD HH:mm:ss"
  user_name:  string;
  user_role:  string;
  action:     string;  // payment_created, payment_approved, registry_paid, ...
  object:     string;
  details:    string;
}

export interface AuditFilter {
  user?:    string;
  action?:  string;
  from?:    string;
  to?:      string;
  page?:    number;
  per_page?: number;
}

const mockLog: AuditEntry[] = [
  { id: 15, timestamp: "2026-06-26 15:40", user_name: "Петров И.А.",   user_role: "Казначей",      action: "payment_moved",       object: "Заявка № 2847",          details: "Дата: 29.06 → 26.06.2026" },
  { id: 14, timestamp: "2026-06-26 15:00", user_name: "Петров И.А.",   user_role: "Казначей",      action: "registry_paid",       object: "Реестр 18.06.2026",       details: "Статус: paid. 1 240 000 ₽" },
  { id: 13, timestamp: "2026-06-26 14:30", user_name: "Петров И.А.",   user_role: "Казначей",      action: "registry_created",    object: "Реестр 18.06.2026",       details: "5 заявок, 1 240 000 ₽" },
  { id: 12, timestamp: "2026-06-26 12:10", user_name: "Козлова Е.В.",  user_role: "Руководитель",  action: "payment_approved",    object: "Заявка № 2845",           details: "На согласовании → Согласована" },
  { id: 11, timestamp: "2026-06-26 11:45", user_name: "Иванова М.С.",  user_role: "Инициатор",     action: "payment_submitted",   object: "Заявка № 2843",           details: "Черновик → На согласовании" },
  { id: 10, timestamp: "2026-06-26 11:42", user_name: "Иванова М.С.",  user_role: "Инициатор",     action: "payment_created",     object: "Заявка № 2843",           details: "Сумма: 85 000 ₽, ООО ТехСервис" },
  { id: 9,  timestamp: "2026-06-25 16:20", user_name: "Иванова М.С.",  user_role: "Инициатор",     action: "income_created",      object: "Поступление № 2301",      details: "280 000 ₽ от ООО Альфа-Трейд" },
  { id: 8,  timestamp: "2026-06-24 17:30", user_name: "Козлова Е.В.",  user_role: "Руководитель",  action: "payment_rejected",    object: "Заявка № 2835",           details: "Причина: неверные реквизиты" },
  { id: 7,  timestamp: "2026-06-23 11:00", user_name: "Сидоров А.К.",  user_role: "Администратор", action: "account_updated",     object: "Расчётный счёт №1",       details: "Нач. остаток: 500 000 ₽" },
  { id: 6,  timestamp: "2026-06-23 10:30", user_name: "Сидоров А.К.",  user_role: "Администратор", action: "counterparty_added",  object: "ООО РентаГрупп",          details: "ИНН: 7904567890" },
  { id: 5,  timestamp: "2026-06-23 09:50", user_name: "Сидоров А.К.",  user_role: "Администратор", action: "user_created",        object: "Иванова М.С.",            details: "Роль: Инициатор" },
  { id: 4,  timestamp: "2026-06-23 08:45", user_name: "Петров И.А.",   user_role: "Казначей",      action: "user_login",          object: "—",                       details: "IP: 10.0.0.5" },
];

const real = {
  getAll: (f?: AuditFilter) => client.get<{ data: AuditEntry[]; total: number }>("/audit", { params: f }).then(r => r.data),
};

const mock = {
  getAll: (f?: AuditFilter) => {
    let result = [...mockLog];
    if (f?.user)   result = result.filter(e => e.user_name.includes(f.user!));
    if (f?.action) result = result.filter(e => e.action === f.action);
    return delay({ data: result, total: result.length });
  },
};

export const auditService = USE_MOCK ? mock : real;
