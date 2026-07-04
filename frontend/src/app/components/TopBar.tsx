import { useState, useRef, useEffect, type ComponentType } from "react";
import { Bell, User, Settings, LogOut, AlertTriangle, CheckCircle, Mail, Palette } from "lucide-react";
import { C, THEMES, applyTheme, currentTheme, type ThemeKey } from "../tokens";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";

interface TopBarProps {
  title:           string;
  onOpenProfile?:  () => void;
  onOpenSettings?: () => void;
}

const NOTIFICATIONS = [
  { id: 1, type: "danger" as const, icon: AlertTriangle, text: "Кассовый разрыв 24 июня: −270 000 ₽",           time: "10 мин назад", read: false },
  { id: 2, type: "success" as const, icon: CheckCircle,  text: "Заявка № 2845 согласована",                      time: "43 мин назад", read: false },
  { id: 3, type: "info" as const,   icon: Mail,          text: "Новая заявка № 2848 от Иванова М.С.",             time: "1 ч назад",    read: true  },
];

const NOTIF_TYPE_COLORS = {
  danger:  { icon: C.danger,  bg: C.danger12 },
  success: { icon: C.sage,    bg: C.sage10   },
  info:    { icon: C.olive,   bg: C.olive20  },
};

export function TopBar({ title, onOpenProfile, onOpenSettings }: TopBarProps) {
  const { user, logout } = useAuth();
  const [showNotif,   setShowNotif]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [readIds,     setReadIds]     = useState<Set<number>>(new Set());
  const [theme,       setTheme]       = useState<ThemeKey>(currentTheme());
  const [showTheme,   setShowTheme]   = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unread = NOTIFICATIONS.filter(n => !n.read && !readIds.has(n.id)).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (themeRef.current   && !themeRef.current.contains(e.target as Node))   setShowTheme(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openNotif = () => {
    setShowNotif(v => !v);
    setShowProfile(false);
    // Mark all as read when opening
    setReadIds(new Set(NOTIFICATIONS.map(n => n.id)));
  };
  const openProfile = () => {
    setShowProfile(v => !v);
    setShowNotif(false);
  };

  return (
    <header style={{ height: 56, background: C.surface, borderBottom: `1px solid ${C.warm}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, fontFamily: "Inter, sans-serif", position: "relative", zIndex: 200 }}>
      {/* Left: logo + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.textDk, letterSpacing: -0.3 }}>TrueMachine</span>
        <div style={{ width: 1, height: 18, background: C.warm }} />
        <span style={{ fontSize: 14, color: C.textLt }}>{title}</span>
      </div>

      {/* Right: role + bell + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {user && (
          <span style={{ padding: "3px 10px", borderRadius: 4, background: C.ivory, fontSize: 12, fontWeight: 500, color: C.textLt }}>
            {ROLE_LABELS[user.role]}
          </span>
        )}

        {/* ── Palette switcher ── */}
        <div ref={themeRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowTheme(v => !v)}
            title="Сменить палитру"
            style={{ background: showTheme ? C.ivory : "none", border: `1px solid ${showTheme ? C.warm : "transparent"}`, cursor: "pointer", color: C.textLt, padding: "4px 8px", display: "flex", alignItems: "center", gap: 6, borderRadius: 6, transition: "all 0.15s" }}
          >
            <Palette size={15} />
            <div style={{ display: "flex", gap: 3 }}>
              {(Object.keys(THEMES) as ThemeKey[]).map(k => (
                <div key={k} style={{ display: "flex", gap: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: THEMES[k].dot1, border: theme === k ? `1.5px solid ${C.textDk}` : "1px solid transparent", outline: theme === k ? `1.5px solid ${C.surface}` : undefined, outlineOffset: theme === k ? "-1px" : undefined }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: THEMES[k].dot2 }} />
                  {THEMES[k].dot3 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: THEMES[k].dot3 }} />}
                </div>
              ))}
            </div>
          </button>

          {showTheme && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 220, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(44,44,30,0.16)", zIndex: 300, padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textLt, padding: "4px 8px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Цветовая схема
              </div>
              {(Object.keys(THEMES) as ThemeKey[]).map(k => {
                const t = THEMES[k];
                const active = theme === k;
                return (
                  <button
                    key={k}
                    onClick={() => { applyTheme(k); setTheme(k); setShowTheme(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 6, border: active ? `1.5px solid ${C.warm}` : "1.5px solid transparent", background: active ? C.ivory : "transparent", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.12s" }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = C.ivory; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, background: t.dot1 }} />
                      <div style={{ width: 20, height: 20, borderRadius: 4, background: t.dot2 }} />
                      {t.dot3 && <div style={{ width: 20, height: 20, borderRadius: 4, background: t.dot3 }} />}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: C.textDk }}>{t.label}</div>
                      {active && <div style={{ fontSize: 11, color: C.textLt }}>Активная</div>}
                    </div>
                    {active && (
                      <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: C.sage }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button onClick={openNotif}
            style={{ background: "none", border: "none", cursor: "pointer", color: showNotif ? C.sage : C.textLt, padding: 4, display: "flex", alignItems: "center", borderRadius: 6, transition: "color 0.15s" }}>
            <Bell size={18} />
            {unread > 0 && (
              <span style={{ position: "absolute", top: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: C.danger, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.surface}` }}>
                {unread}
              </span>
            )}
          </button>

          {showNotif && (
            <NotifDropdown
              notifications={NOTIFICATIONS}
              readIds={readIds}
              typeColors={NOTIF_TYPE_COLORS}
            />
          )}
        </div>

        {/* Profile avatar */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <div onClick={openProfile}
            style={{ width: 32, height: 32, borderRadius: "50%", background: showProfile ? C.sageHov : C.sage, display: "flex", alignItems: "center", justifyContent: "center", color: C.surface, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 0.15s", userSelect: "none" }}>
            {user?.avatar ?? "??"}
          </div>

          {showProfile && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 200, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(44,44,30,0.16)", zIndex: 300, overflow: "hidden" }}>
              {/* User info */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.warm}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{user?.name ?? "—"}</div>
                <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>{user?.email ?? ""}</div>
              </div>
              {/* Menu items */}
              {[
                { icon: User,     label: "Мой профиль", action: () => { setShowProfile(false); onOpenProfile?.();  } },
                { icon: Settings, label: "Настройки",   action: () => { setShowProfile(false); onOpenSettings?.(); } },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", color: C.textDk, fontSize: 13, fontFamily: "Inter, sans-serif", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.ivory)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Icon size={14} color={C.textLt} />
                  {label}
                </button>
              ))}
              <div style={{ height: 1, background: C.warm, margin: "4px 0" }} />
              {/* ── Logout — STUB: замените на DELETE /api/auth/logout ── */}
              <button onClick={() => { setShowProfile(false); logout(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", color: C.danger, fontSize: 13, fontFamily: "Inter, sans-serif", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = C.ivory)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <LogOut size={14} color={C.danger} />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── NotifDropdown ─────────────────────────────────────────
 * Отдельный компонент чтобы state-hover корректно применял
 * CSS-переменные текущей темы через React state (не element.style).
 * ──────────────────────────────────────────────────────── */
interface NotifEntry {
  id: number; type: "danger" | "success" | "info";
  icon: ComponentType<{ size: number; color?: string }>;
  text: string; time: string; read: boolean;
}
interface TypeColor { icon: string; bg: string; }

function NotifDropdown({
  notifications, readIds, typeColors,
}: {
  notifications: NotifEntry[];
  readIds:    Set<number>;
  typeColors: Record<string, TypeColor>;
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0,
      width: 320, background: C.surface, border: `1px solid ${C.warm}`,
      borderRadius: 8,
      boxShadow: `0 4px 16px ${C.overlay}`,  /* тема-зависимая тень */
      zIndex: 300, overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.warm}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>Уведомления</span>
        <span style={{ fontSize: 11, color: C.textLt }}>Все прочитаны</span>
      </div>

      {notifications.map(n => {
        const Icon  = n.icon;
        const tc    = typeColors[n.type] as TypeColor;
        const isNew = !n.read && !readIds.has(n.id);
        const isHov = hoveredId === n.id;

        /* Цвет фона строки — всё через C.* токены (CSS-переменные) */
        const rowBg = isHov ? C.beige30 : isNew ? C.sage10 : "transparent";

        return (
          <div
            key={n.id}
            onMouseEnter={() => setHoveredId(n.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${C.warm}`,   /* тема-зависимый разделитель */
              display: "flex", gap: 10,
              background: rowBg,                     /* тема-зависимый hover */
              cursor: "pointer",
              transition: "background 0.1s",
            }}
          >
            {/* Иконка — цвет из активной темы */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: tc.bg,                     /* C.sage10 / C.danger12 / C.olive20 */
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={13} color={tc.icon} />     {/* C.sage / C.danger / C.olive */}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: C.textDk, lineHeight: 1.4 }}>{n.text}</div>
              <div style={{ fontSize: 11, color: C.textLt, marginTop: 3 }}>{n.time}</div>
            </div>

            {/* Непрочитанная точка — акцентный цвет темы */}
            {isNew && (
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.sage, flexShrink: 0, marginTop: 5 }} />
            )}
          </div>
        );
      })}

      <div style={{ padding: "10px 16px", textAlign: "center" }}>
        <button style={{ background: "none", border: "none", color: C.sage, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          Все уведомления
        </button>
      </div>
    </div>
  );
}
