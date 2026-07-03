/**
 * authService — авторизация.
 *
 *   POST /api/login     → { token: string, user: ApiUser }
 *   POST /api/logout    → { message: string }
 *   GET  /api/me        → ApiUser
 */

import client from "../client";
import { delay } from "../mocks/handlers";
import { mockUsers } from "../mocks/data/users";
import { USE_MOCK } from "../../config";

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: "initiator" | "treasurer" | "manager" | "admin";
}

export interface LoginPayload  { email: string; password: string; }
export interface LoginResponse { token: string; user: ApiUser; }

const real = {
  login:  (data: LoginPayload) => client.post<LoginResponse>("/login", data).then(r => r.data),
  logout: ()                   => client.post("/logout").then(r => r.data),
  me:     ()                   => client.get<ApiUser>("/me").then(r => r.data),
};

const mock = {
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    const user = mockUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (!user || data.password.length < 4) {
      throw { response: { status: 401, data: { message: "Неверный email или пароль" } } };
    }
    const token = `mock-jwt-${user.id}-${Date.now()}`;
    return delay({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  },
  logout: () => delay({ message: "OK" }),
  me: () => {
    const raw = localStorage.getItem("tm_auth_user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user) throw { response: { status: 401 } };
    return delay({ id: user.id, name: user.name, email: user.email, role: user.role });
  },
};

export const authService = USE_MOCK ? mock : real;
