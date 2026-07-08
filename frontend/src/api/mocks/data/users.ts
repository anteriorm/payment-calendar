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
  { id: 1, name: "Сидоров Андрей К.",  email: "admin@truemachine.ru",      role: "admin",     status: "active" },
  { id: 2, name: "Иванова Мария С.",   email: "initiator@truemachine.ru",  role: "initiator", status: "active" },
  { id: 3, name: "Козлова Елена В.",   email: "treasurer@truemachine.ru",  role: "treasurer", status: "active" },
  { id: 4, name: "Петров Иван А.",     email: "manager@truemachine.ru",    role: "manager",   status: "active" },
];
