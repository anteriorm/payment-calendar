import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "../../api/endpoints/auth";

export type Role = "initiator" | "treasurer" | "manager" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

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
  | "recurring"
  | "audit";

export const ROLE_SCREENS: Record<Role, Screen[]> = {
  initiator: ["dashboard", "calendar", "requests", "recurring", "income", "references"],
  treasurer: ["dashboard", "calendar", "requests", "recurring", "income", "registry", "reports", "references"],
  manager:   ["dashboard", "calendar", "requests", "recurring", "income", "registry", "reports", "references"],
  admin:     ["dashboard", "calendar", "requests", "recurring", "income", "registry", "reports", "references", "audit"],
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
  initializing: boolean;
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
  user: null, isAuthed: false, initializing: true, perms: EMPTY_PERMS,
  login: async () => ({ ok: false }),
  logout: () => {},
  updateUser: () => {},
});

const USER_STORAGE_KEY = "tm_auth_user";
const TOKEN_STORAGE_KEY = "tm_auth_token";

const ROLES: Role[] = ["initiator", "treasurer", "manager", "admin"];

export function nameToAvatar(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function toAuthUser(raw: { id: number; name: string; email: string; role: string }): AuthUser {
  const role = ROLES.includes(raw.role as Role) ? (raw.role as Role) : "initiator";
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role,
    avatar: nameToAvatar(raw.name),
  };
}

function authErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
  if (axiosErr.response?.status === 401) return "Неверный email или пароль";
  return "Сетевая ошибка. Проверьте подключение к серверу.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

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

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setInitializing(false);
      return;
    }

    authService.me()
      .then(data => persist(toAuthUser(data as { id: number; name: string; email: string; role: string }), token))
      .catch(() => persist(null))
      .finally(() => setInitializing(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { token, user: apiUser } = await authService.login({ email, password });
      persist(toAuthUser(apiUser), token);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  };

  const logout = () => {
    authService.logout().catch(() => {}).finally(() => persist(null));
  };

  const updateUser = (patch: Partial<Pick<AuthUser, "name" | "email">>) => {
    if (!user) return;
    const updated: AuthUser = {
      ...user,
      ...patch,
      avatar: patch.name ? nameToAvatar(patch.name) : user.avatar,
    };
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) persist(updated, token);
  };

  const perms = user ? ROLE_PERMS[user.role] : EMPTY_PERMS;
  const isAuthed = Boolean(user && localStorage.getItem(TOKEN_STORAGE_KEY));

  return (
    <AuthContext.Provider value={{ user, isAuthed, initializing, perms, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
