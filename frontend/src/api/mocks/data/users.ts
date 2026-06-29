/** Формат: User — совпадает с GET /api/users */
export type UserRole = "initiator" | "treasurer" | "manager" | "admin";

export interface User {
  id:     number;
  name:   string;
  email:  string;
  role:   UserRole;
  status: "active" | "inactive";
}

export const mockUsers: User[] = [
  { id: 1, name: "Иванова М.С.",  email: "m.ivanova@truemachine.ru",  role: "initiator", status: "active"   },
  { id: 2, name: "Петров И.А.",   email: "i.petrov@truemachine.ru",   role: "treasurer", status: "active"   },
  { id: 3, name: "Козлова Е.В.",  email: "e.kozlova@truemachine.ru",  role: "manager",   status: "active"   },
  { id: 4, name: "Сидоров А.К.",  email: "a.sidorov@truemachine.ru",  role: "admin",     status: "active"   },
  { id: 5, name: "Орлов В.Д.",    email: "v.orlov@truemachine.ru",    role: "initiator", status: "inactive" },
];
