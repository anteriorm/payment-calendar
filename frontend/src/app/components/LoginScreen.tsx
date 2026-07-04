import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { C } from "../tokens";
import { useAuth } from "../context/AuthContext";
import { email as validateEmail, minLen, firstError } from "../utils/validation";

export function LoginScreen() {
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = firstError(
      validateEmail(email),
      minLen(4, password) && "Пароль: минимум 4 символа",
    );
    if (validationError) { setError(validationError); return; }
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Ошибка входа");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.ivory,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: C.sage,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="4" width="18" height="14" rx="2" stroke="#FAFAF5" strokeWidth="1.8"/>
                <path d="M2 8h18" stroke="#FAFAF5" strokeWidth="1.8"/>
                <path d="M7 12h3M7 15h6" stroke="#FAFAF5" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.textDk, letterSpacing: -0.5 }}>
              TrueMachine
            </span>
          </div>
          <p style={{ fontSize: 14, color: C.textLt, margin: 0 }}>
            Платёжный календарь · ТЗ-03/2026
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.warm}`,
            borderRadius: 12,
            padding: "32px 32px 28px",
            boxShadow: "0 2px 16px rgba(44,44,30,0.10)",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: "0 0 24px" }}>
            Вход в систему
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="initiator@example.com"
                required
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: `1px solid ${C.warm}`,
                  borderRadius: 6,
                  background: C.surface,
                  fontSize: 14,
                  color: C.textDk,
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                  transition: "border 0.15s",
                }}
                onFocus={e => (e.target.style.border = `1.5px solid ${C.sage}`)}
                onBlur={e  => (e.target.style.border = `1px solid ${C.warm}`)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>
                Пароль
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "9px 40px 9px 12px",
                    border: `1px solid ${C.warm}`,
                    borderRadius: 6,
                    background: C.surface,
                    fontSize: 14,
                    color: C.textDk,
                    outline: "none",
                    fontFamily: "Inter, sans-serif",
                    boxSizing: "border-box",
                    transition: "border 0.15s",
                  }}
                  onFocus={e => (e.target.style.border = `1.5px solid ${C.sage}`)}
                  onBlur={e  => (e.target.style.border = `1px solid ${C.warm}`)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: C.textLt,
                    padding: 4, display: "flex",
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(192,80,74,0.08)",
                  border: `1px solid ${C.danger}`,
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#8B2020",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 0",
                borderRadius: 6,
                background: loading ? C.ivory : C.sage,
                color: C.surface,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "background 0.15s",
                marginTop: 4,
              }}
            >
              {loading ? "Вход…" : "Войти"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: C.textLt, marginTop: 16 }}>
          TrueMachine · Летняя практика УлГТУ 2026
        </p>
      </div>
    </div>
  );
}
