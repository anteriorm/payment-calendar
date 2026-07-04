/**
 * usersService — управление пользователями (только Admin).
 *
 * Бэкенд должен реализовать:
 *   GET    /api/users       → User[]
 *   POST   /api/users       → User
 *   PUT    /api/users/{id}  → User
 *   DELETE /api/users/{id}  → { message }
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockUsers, type User } from "../mocks/data/users";
import { USE_MOCK } from "../../config";

let store: User[] = [...mockUsers];

const real = {
  getAll:  ()                                                    => client.get<User[]>("/users").then(r => r.data),
  create:  (data: Omit<User, "id"> & { password?: string })     => client.post<User>("/users", data).then(r => r.data),
  update:  (id: number, data: Partial<User> & { password?: string }) => client.put<User>(`/users/${id}`, data).then(r => r.data),
  delete:  (id: number)                                         => client.delete(`/users/${id}`).then(r => r.data),
};

const mock = {
  getAll: () => delay([...store]),
  create: (data: Omit<User, "id">) => {
    const u: User = { ...data, id: randomId() };
    store = [...store, u];
    return delay(u);
  },
  update: (id: number, data: Partial<User>) => {
    store = store.map(u => u.id === id ? { ...u, ...data } : u);
    return delay(store.find(u => u.id === id)!);
  },
  delete: (id: number) => {
    store = store.filter(u => u.id !== id);
    return delay({ message: "Пользователь удалён" });
  },
};

export const usersService = USE_MOCK ? mock : real;
