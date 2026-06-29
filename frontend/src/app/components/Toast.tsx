import { createContext, useContext, useRef, useState, useEffect } from "react";

export type ToastType = "success" | "warning" | "error";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Цвета тостов через CSS-переменные темы — меняются вместе с палитрой.
 * warning использует --tm-toast-warn (определён в каждой теме).
 */
const TOAST_CFG: Record<ToastType, { bg: string; textColor: string; border: string; icon: string }> = {
  success: { bg: "var(--tm-sage)",        textColor: "var(--tm-surface)",  border: "var(--tm-sageAct)",     icon: "✓" },
  warning: { bg: "var(--tm-toast-warn)",  textColor: "var(--tm-toast-warn-text)", border: "var(--tm-toast-warn-border)", icon: "⚠" },
  error:   { bg: "var(--tm-danger)",      textColor: "var(--tm-surface)",  border: "rgba(0,0,0,0.15)",      icon: "✕" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const showToast = (message: string, type: ToastType = "success") => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 3000,
          pointerEvents: "none",
        }}
      >
        {toasts.map(t => (
          <ToastBubble key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ toast }: { toast: ToastItem }) {
  const [show, setShow] = useState(false);
  const cfg = TOAST_CFG[toast.type];

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 16);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        padding: "12px 18px",
        borderRadius: 10,
        background: cfg.bg,
        color: cfg.textColor,
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 260,
        maxWidth: 380,
        boxShadow: `0 4px 20px rgba(0,0,0,0.18), inset 0 0 0 1px ${cfg.border}`,
        transform: show ? "translateY(0)" : "translateY(16px)",
        opacity: show ? 1 : 0,
        transition: "transform 0.20s ease-out, opacity 0.20s ease-out",
        fontFamily: "Inter, sans-serif",
        pointerEvents: "auto",
      }}
    >
      <span style={{ flexShrink: 0, fontSize: 15 }}>{cfg.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}
