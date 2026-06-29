/**
 * Конфигурация приложения.
 *
 * USE_MOCK=true  — данные берутся из src/api/mocks/ (режим без бэкенда)
 * USE_MOCK=false — данные берутся из реального Laravel API
 *
 * Переключение: файл .env, переменная VITE_USE_MOCK
 */

// По умолчанию используем моки, если явно не указано false
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK !== "false";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
