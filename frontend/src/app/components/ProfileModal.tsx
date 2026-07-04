import { useState } from "react";
import { X, Camera } from "lucide-react";
import { C } from "../tokens";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";
import { useToast } from "./Toast";
import { required, email as validateEmail, passwordStrength, passwordMatch } from "../utils/validation";
import * as api from "../../api";

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [name,     setName]     = useState(user?.name  ?? "");
  const [email,    setEmail]    = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [focused,  setFocused]  = useState("");
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  if (!user) return null;

  const inp = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: focused === field ? `1.5px solid ${C.sage}` : `1px solid ${C.warm}`,
    boxShadow: focused === field ? `0 0 0 3px ${C.sage20}` : "none",
    background: C.surface,
    fontSize: 14,
    color: C.textDk,
    outline: "none",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box" as const,
    transition: "border 0.15s, box-shadow 0.15s",
  });

  const handleSave = () => {
    const e: Record<string, string> = {};
    const nameErr  = required(name,  "Укажите имя");
    const emailErr = validateEmail(email);
    if (nameErr)  e.name  = nameErr;
    if (emailErr) e.email = emailErr;
    if (password) {
      const pwErr = passwordStrength(password);
      if (pwErr) e.password = pwErr;
      else {
        const matchErr = passwordMatch(password, confirm);
        if (matchErr) e.confirm = matchErr;
      }
    }
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    const payload: any = { name: name.trim() || user.name, email: email.trim() || user.email };
    if (password) payload.password = password;
    api.users.update(user.id, payload)
      .then(() => { updateUser({ name: payload.name, email: payload.email }); showToast("Профиль обновлён", "success"); onClose(); })
      .catch(() => showToast("Ошибка обновления профиля", "error"));
  };

  const rc: Record<string, { bg: string; color: string }> = {
    initiator: { bg: "rgba(160,160,128,0.18)", color: "#555540" },
    treasurer: { bg: "rgba(128,160,128,0.18)", color: "#3D6B3D" },
    manager:   { bg: "#E0C0A0",                color: "#7A5A30" },
    admin:     { bg: "rgba(192,80,74,0.14)",   color: "#8B2020" },
  };
  const roleStyle = rc[user.role] ?? rc.initiator;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: C.overlay,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1200, fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480,
          background: C.surface,
          border: `1px solid ${C.warm}`,
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(44,44,30,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: 0 }}>Мой профиль</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: C.sage, display: "flex", alignItems: "center",
                  justifyContent: "center", color: C.surface,
                  fontSize: 20, fontWeight: 700,
                }}
              >
                {user.avatar}
              </div>
              <button
                title="Загрузить фото (заглушка)"
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 22, height: 22, borderRadius: "50%",
                  background: C.warm, border: `2px solid ${C.surface}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: C.textDk,
                }}
              >
                <Camera size={11} />
              </button>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{user.name}</div>
              <div style={{ fontSize: 12, color: C.textLt, marginTop: 2 }}>{user.email}</div>
              <span
                style={{
                  display: "inline-flex",
                  marginTop: 6,
                  padding: "2px 9px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  background: roleStyle.bg,
                  color: roleStyle.color,
                }}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          <div style={{ height: 1, background: C.warm }} />

          {/* Edit form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: errors.name ? C.danger : C.textLt, display: "block", marginBottom: 6 }}>Имя</label>
              <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: ""})); }}
                onFocus={() => setFocused("name")} onBlur={() => setFocused("")}
                style={{ ...inp("name"), ...(errors.name ? { border: `1.5px solid ${C.danger}` } : {}) }} />
              {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: errors.email ? C.danger : C.textLt, display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ""})); }}
                onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                style={{ ...inp("email"), ...(errors.email ? { border: `1.5px solid ${C.danger}` } : {}) }} />
              {errors.email && <ErrMsg>{errors.email}</ErrMsg>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: errors.password ? C.danger : C.textLt, display: "block", marginBottom: 6 }}>Новый пароль</label>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: "", confirm: ""})); }}
                  placeholder="оставьте пустым"
                  onFocus={() => setFocused("pw")} onBlur={() => setFocused("")}
                  style={{ ...inp("pw"), ...(errors.password ? { border: `1.5px solid ${C.danger}` } : {}) }} />
                {errors.password && <ErrMsg>{errors.password}</ErrMsg>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: errors.confirm ? C.danger : C.textLt, display: "block", marginBottom: 6 }}>Повторите пароль</label>
                <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setErrors(p => ({...p, confirm: ""})); }}
                  placeholder="оставьте пустым"
                  onFocus={() => setFocused("confirm")} onBlur={() => setFocused("")}
                  style={{ ...inp("confirm"), ...(errors.confirm ? { border: `1.5px solid ${C.danger}` } : {}) }} />
                {errors.confirm && <ErrMsg>{errors.confirm}</ErrMsg>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Сохранить изменения
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

function ErrMsg({ children }: { children: string }) {
  return <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{children}</span>;
}
