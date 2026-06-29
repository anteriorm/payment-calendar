import { C } from "../tokens";

/**
 * TableSkeleton — анимированные строки-заглушки для таблиц.
 * Показывается пока загружаются данные из API.
 */
interface TableSkeletonProps {
  rows?:    number;
  cols?:    string;   // gridTemplateColumns CSS
  rowH?:   number;
}

const pulse: React.CSSProperties = {
  background: `linear-gradient(90deg, ${C.ivory} 25%, ${C.warm} 50%, ${C.ivory} 75%)`,
  backgroundSize: "200% 100%",
  animation: "skeleton-pulse 1.4s ease-in-out infinite",
  borderRadius: 4,
};

export function TableSkeleton({ rows = 6, cols = "repeat(5, 1fr)", rowH = 48 }: TableSkeletonProps) {
  const widths = ["60%", "85%", "70%", "45%", "55%", "90%", "40%", "75%"];
  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            height: rowH,
            borderBottom: `1px solid rgba(192,192,160,0.35)`,
            background: r % 2 === 0 ? C.surface : C.ivory50,
            padding: "0 4px",
            alignItems: "center",
            gap: 8,
          }}
        >
          {cols.split(" ").map((_, c) => (
            <div key={c} style={{ padding: "0 8px" }}>
              <div style={{ ...pulse, height: 12, width: widths[(r + c) % widths.length] }} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/** Компонент для состояния ошибки в таблице */
export function TableError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#8B2020", fontFamily: "Inter, sans-serif" }}>
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
        >
          Повторить
        </button>
      )}
    </div>
  );
}
