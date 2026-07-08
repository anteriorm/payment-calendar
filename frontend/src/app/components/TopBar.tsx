import { useState, useRef, useEffect } from "react";
import { User, LogOut, Palette } from "lucide-react";
import { C, THEMES, applyTheme, currentTheme, type ThemeKey } from "../tokens";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";

interface TopBarProps {
  title:           string;
  onOpenProfile?:  () => void;
}

export function TopBar({ title, onOpenProfile }: TopBarProps) {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [theme,       setTheme]       = useState<ThemeKey>(currentTheme());
  const [showTheme,   setShowTheme]   = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (themeRef.current   && !themeRef.current.contains(e.target as Node))   setShowTheme(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openProfile = () => {
    setShowProfile(v => !v);
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
