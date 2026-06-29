/**
 * itemsService — статьи движения денег.
 *
 * Бэкенд: GET/POST/PUT/DELETE /api/items и /api/items/{id}
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import { mockItems, type Item } from "../mocks/data/items";
import { USE_MOCK } from "../../config";

let store: Item[] = [...mockItems];

const real = {
  getAll:  ()                          => client.get<Item[]>("/items").then(r => r.data),
  create:  (data: Omit<Item, "id">)    => client.post<Item>("/items", data).then(r => r.data),
  update:  (id: number, d: Partial<Item>) => client.put<Item>(`/items/${id}`, d).then(r => r.data),
  delete:  (id: number)                => client.delete(`/items/${id}`).then(r => r.data),
};

const mock = {
  getAll: () => delay([...store]),
  create: (data: Omit<Item, "id">) => { const i = { ...data, id: randomId() } as Item; store = [...store, i]; return delay(i); },
  update: (id: number, d: Partial<Item>) => { store = store.map(i => i.id === id ? { ...i, ...d } : i); return delay(store.find(i => i.id === id)!); },
  delete: (id: number) => { store = store.filter(i => i.id !== id); return delay({ message: "OK" }); },
};

export const itemsService = USE_MOCK ? mock : real;
