import { useState } from "react";
import { X, Bell, Globe, Monitor } from "lucide-react";
import { C, THEMES, applyTheme, currentTheme, type ThemeKey } from "../tokens";
import { useToast } from "./Toast";

interface SettingsModalProps {
  onClose: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch" aria-checked={checked}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? C.sage : C.warm,
        cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: C.surface,
        position: "absolute", top: 2,
        left: checked ? 18 : 2, transition: "left 0.18s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
      }} />
    </div>
  );
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { showToast } = useToast();
  const [theme,    setThemeState] = useState<ThemeKey>(currentTheme());
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifCashgap, setNotifCashgap] = useState(true);
  const [notifApproval, setNotifApproval] = useState(true);
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [denseDefault, setDenseDefault] = useState(false);

  const handleTheme = (k: ThemeKey) => {
    applyTheme(k);
    setThemeState(k);
  };

  const handleSave = () => {
    // STUB: PATCH /api/users/me/settings { notifications, timezone, ... }
    showToast("Настройки сохранены", "success");
    onClose();
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 12, fontWeight: 600, color: C.textLt, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 14px" }}>
        {title}
      </h3>
      {children}
    </div>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid rgba(192,192,160,0.30)` }}>
      <div>
        <div style={{ fontSize: 13, color: C.textDk }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, fontFamily: "Inter, sans-serif" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 500, maxHeight: "88vh", background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}`, flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: 0 }}>Настройки</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>

          {/* Уведомления */}
          <Section title="Уведомления">
            <Bell size={14} color={C.textLt} style={{ marginBottom: 10 }} />
            <Row label="Уведомления на email" sub="Отправлять письма о важных событиях">
              <Toggle checked={notifEmail} onChange={() => setNotifEmail(v => !v)} />
            </Row>
            <Row label="Кассовые разрывы" sub="Предупреждать при обнаружении разрыва">
              <Toggle checked={notifCashgap} onChange={() => setNotifCashgap(v => !v)} />
            </Row>
            <Row label="Согласование заявок" sub="Оповещать об изменении статуса заявки">
              <Toggle checked={notifApproval} onChange={() => setNotifApproval(v => !v)} />
            </Row>
          </Section>

          {/* Интерфейс */}
          <Section title="Интерфейс">
            <Monitor size={14} color={C.textLt} style={{ marginBottom: 10 }} />
            <Row label="Компактный вид по умолчанию" sub="Уменьшенные строки в таблицах">
              <Toggle checked={denseDefault} onChange={() => setDenseDefault(v => !v)} />
            </Row>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textLt, marginBottom: 10 }}>Цветовая схема</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([k, t]) => (
                  <button
                    key={k}
                    onClick={() => handleTheme(k)}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 8,
                      border: theme === k ? `2px solid ${C.sage}` : `1px solid ${C.warm}`,
                      background: theme === k ? C.sage10 : "transparent",
                      cursor: "pointer", fontFamily: "Inter, sans-serif",
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: t.dot1 }} />
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: t.dot2 }} />
                      {t.dot3 && <div style={{ width: 18, height: 18, borderRadius: 4, background: t.dot3 }} />}
                    </div>
                    <span style={{ fontSize: 13, color: theme === k ? C.sage : C.textDk, fontWeight: theme === k ? 600 : 400 }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Регион */}
          <Section title="Регион и язык">
            <Globe size={14} color={C.textLt} style={{ marginBottom: 10 }} />
            <Row label="Часовой пояс" sub="Используется для отображения времени">
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                style={{
                  padding: "5px 10px", border: `1px solid ${C.warm}`, borderRadius: 6,
                  background: C.surface, fontSize: 13, color: C.textDk, outline: "none",
                  fontFamily: "Inter, sans-serif", cursor: "pointer",
                }}
              >
                <option value="Europe/Moscow">Москва (UTC+3)</option>
                <option value="Europe/Samara">Самара (UTC+4)</option>
                <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
              </select>
            </Row>
            <Row label="Язык интерфейса" sub="">
              <span style={{ fontSize: 13, color: C.textLt }}>Русский</span>
            </Row>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={handleSave}
            style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Сохранить
          </button>
          <button onClick={onClose}
            style={{ padding: "9px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
