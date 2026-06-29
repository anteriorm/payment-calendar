/**
 * authService — авторизация.
 *
 * Бэкенд должен реализовать:
 *   POST /api/login     → { token: string, user: User }
 *   POST /api/logout    → { message: string }
 *   GET  /api/me        → User (текущий пользователь)
 */

import client from "../client";
import { delay } from "../mocks/handlers";
import { mockUsers } from "../mocks/data/users";
import { USE_MOCK } from "../../config";

export interface LoginPayload  { email: string; password: string; }
export interface LoginResponse { token: string; user: typeof mockUsers[number]; }

const real = {
  login:  (data: LoginPayload) => client.post<LoginResponse>("/login", data).then(r => r.data),
  logout: ()                   => client.post("/logout").then(r => r.data),
  me:     ()                   => client.get("/me").then(r => r.data),
};

const mock = {
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    const user = mockUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (!user || data.password.length < 4) {
      throw { response: { status: 401, data: { message: "Неверный email или пароль" } } };
    }
    const token = `mock-jwt-${user.id}-${Date.now()}`;
    localStorage.setItem("tm_auth_token", token);
    return delay({ token, user });
  },
  logout: () => {
    localStorage.removeItem("tm_auth_token");
    return delay({ message: "OK" });
  },
  me: () => {
    const raw = localStorage.getItem("tm_auth_user");
    const user = raw ? JSON.parse(raw) : null;
    return delay(user);
  },
};

export const authService = USE_MOCK ? mock : real;
