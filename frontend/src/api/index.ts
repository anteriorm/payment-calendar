/**
 * API — единая точка входа для всех сервисов.
 *
 * Использование в компонентах:
 *   import { api } from '../../api';
 *   const payments = await api.payments.getAll({ status: 'draft' });
 *
 * Переключение на реальный бэкенд:
 *   Установить VITE_USE_MOCK=false в файле .env
 *   Все сервисы автоматически начнут делать реальные HTTP-запросы через axios.
 *
 * ⚠️  Бэкенд должен использовать те же поля, что определены в типах
 *    в src/api/mocks/data/. Смотри TypeScript-интерфейсы там.
 */

export { authService as auth }             from "./endpoints/auth";
export { accountsService as accounts }     from "./endpoints/accounts";
export { counterpartiesService as counterparties } from "./endpoints/counterparties";
export { itemsService as items }           from "./endpoints/items";
export { paymentsService as payments }     from "./endpoints/payments";
export { incomesService as incomes }       from "./endpoints/incomes";
export { calendarService as calendar }     from "./endpoints/calendar";
export { registriesService as registries } from "./endpoints/registries";
export { reportsService as reports }       from "./endpoints/reports";
export { usersService as users }           from "./endpoints/users";
export { auditService as audit }           from "./endpoints/audit";

// Re-export types for convenience
export type { Account }         from "./mocks/data/accounts";
export type { Counterparty }    from "./mocks/data/counterparties";
export type { Item }            from "./mocks/data/items";
export type { Payment, PaymentStatus, PaymentPriority } from "./mocks/data/payments";
export type { Income, IncomeStatus }  from "./mocks/data/incomes";
export type { CalendarDay }     from "./mocks/data/calendar";
export type { User, UserRole }  from "./mocks/data/users";
export type { Registry, RegistryStatus } from "./endpoints/registries";
export type { AuditEntry }      from "./endpoints/audit";
