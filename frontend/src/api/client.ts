/**
 * Axios-инстанс для всех запросов к бэкенду.
 *
 * Что делает:
 * - Подставляет базовый URL из .env (VITE_API_URL)
 * - Автоматически добавляет JWT-токен из localStorage в каждый запрос
 * - При 401 — разлогинивает пользователя и редиректит на /
 * - При 422 — прокидывает ошибки валидации в компоненты
 *
 * Бэкенд должен:
 * - Отдавать токен в POST /api/login → { token: string, user: {...} }
 * - Принимать токен в заголовке: Authorization: Bearer <token>
 * - Отдавать 401 при истёкшем/неверном токене
 * - Отдавать 422 при ошибках валидации в формате:
 *   { message: "...", errors: { field: ["error text"] } }
 */

import axios from "axios";
import { API_URL } from "../config";

const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept":        "application/json",
  },
  timeout: 10000,
});

// ── Запрос: добавляем JWT-токен ─────────────────────────────
client.interceptors.request.use(config => {
  const token = localStorage.getItem("tm_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Ответ: обрабатываем ошибки ──────────────────────────────
client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Токен истёк или не валиден → разлогиниваем
      localStorage.removeItem("tm_auth_user");
      localStorage.removeItem("tm_auth_token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default client;
