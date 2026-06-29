import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "initiator" | "treasurer" | "manager" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string; // инициалы для заглушки аватара (обязательно)
}

// ── Демо-пользователи (используются для отображения в интерфейсе LoginScreen) ──
export const DEMO_USERS: AuthUser[] = [
  { id: 1, name: "Иванова М.С.",  email: "m.ivanova@truemachine.ru",  role: "initiator", avatar: "ИМ" },
  { id: 2, name: "Петров И.А.",   email: "i.petrov@truemachine.ru",   role: "treasurer", avatar: "ПИ" },
  { id: 3, name: "Козлова Е.В.",  email: "e.kozlova@truemachine.ru",  role: "manager",   avatar: "КЕ" },
  { id: 4, name: "Сидоров А.К.",  email: "a.sidorov@truemachine.ru",  role: "admin",     avatar: "СА" },
];

export const ROLE_LABELS: Record<Role, string> = {
  initiator: "Инициатор",
  treasurer: "Казначей",
  manager:   "Руководитель",
  admin:     "Администратор",
};

export type Screen =
  | "dashboard"
  | "calendar" | "requests" | "income"
  | "registry" | "reports" | "references"
  | "audit";

export const ROLE_SCREENS: Record<Role, Screen[]> = {
  initiator: ["dashboard", "calendar", "requests", "income", "references"],
  treasurer: ["dashboard", "calendar", "requests", "income", "registry", "reports", "references"],
  manager:   ["dashboard", "calendar", "requests", "income", "registry", "reports", "references"],
  admin:     ["dashboard", "calendar", "requests", "income", "registry", "reports", "references", "audit"],
};

export interface Permissions {
  canApprove: boolean;
  canReschedule: boolean;
  canFormRegistry: boolean;
  canMarkPaid: boolean;
  canManageRefs: boolean;
  canCreateRequest: boolean;
}

export const ROLE_PERMS: Record<Role, Permissions> = {
  initiator: { canApprove: false, canReschedule: false, canFormRegistry: false, canMarkPaid: false, canManageRefs: false, canCreateRequest: true  },
  treasurer: { canApprove: false, canReschedule: true,  canFormRegistry: true,  canMarkPaid: true,  canManageRefs: false, canCreateRequest: false },
  manager:   { canApprove: true,  canReschedule: false, canFormRegistry: false, canMarkPaid: false, canManageRefs: false, canCreateRequest: false },
  admin:     { canApprove: true,  canReschedule: true,  canFormRegistry: true,  canMarkPaid: true,  canManageRefs: true,  canCreateRequest: true  },
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthed: boolean;
  perms: Permissions;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateUser: (patch: Partial<Pick<AuthUser, "name" | "email">>) => void;
}

const EMPTY_PERMS: Permissions = {
  canApprove: false, canReschedule: false, canFormRegistry: false,
  canMarkPaid: false, canManageRefs: false, canCreateRequest: false,
};

const AuthContext = createContext<AuthContextType>({
  user: null, isAuthed: false, perms: EMPTY_PERMS,
  login: async () => ({ ok: false }),
  logout: () => {},
  updateUser: () => {},
});

const USER_STORAGE_KEY = "tm_auth_user";
const TOKEN_STORAGE_KEY = "tm_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const persist = (u: AuthUser | null, token?: string) => {
    if (u && token) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setUser(u);
  };

  // РЕАЛЬНЫЙ ЗАПРОС К БЭКЕНДУ
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, error: data.message || "Ошибка входа" };
      }

      const { token, user } = data;
      if (!token || !user) {
        return { ok: false, error: "Неверный ответ сервера" };
      }

      persist(user, token);
      return { ok: true };
    } catch (err) {
      console.error("Ошибка при логине:", err);
      return { ok: false, error: "Сетевая ошибка. Проверьте подключение к серверу." };
    }
  };

  const logout = () => {
    persist(null);
    // Можно также отправить запрос на /api/logout, но для простоты удаляем локально
  };

  const updateUser = (patch: Partial<Pick<AuthUser, "name" | "email">>) => {
    if (!user) return;
    const updated = { ...user, ...patch };
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) persist(updated, token);
  };

  const perms = user ? ROLE_PERMS[user.role] : EMPTY_PERMS;
  const isAuthed = Boolean(user && localStorage.getItem(TOKEN_STORAGE_KEY));

  return (
    <AuthContext.Provider value={{ user, isAuthed, perms, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}