/**
 * DashboardScreen — Главная / Обзорный экран.
 *
 * STUB: данные сейчас статические (mock).
 * При подключении бэкенда замените секцию "// STUB DATA" на:
 *   const { data, loading, error } = useApi('/api/dashboard');
 * и используйте данные из ответа.
 */

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, TrendingUp, Clock, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { C } from "../tokens";
import { useAuth } from "../context/AuthContext";
import { ruFmt } from "../utils";

/* ── STUB DATA — replace with GET /api/dashboard ──────────── */
const SUMMARY = {
  totalBalance:     1037500,
  nearestGapDate:   "24 июня 2026",
  nearestGapAmount: -270000,
  pendingCount:     3,
  todayPayments:    142000,
  todayIncome:      250000,
};

const BALANCE_CHART = [
  { date: "23 июн", balance: 60000   },
  { date: "24 июн", balance: -270000 },
  { date: "25 июн", balance: 52000   },
  { date: "26 июн", balance: 108000  },
  { date: "27 июн", balance: -240000 },
  { date: "28 июн", balance: 0       },
  { date: "29 июн", balance: -85000  },
];

const RECENT_EVENTS = [
  { id: 1, time: "11:45", text: "Заявка № 2843 отправлена на согласование",    type: "info"    },
  { id: 2, time: "12:10", text: "Заявка № 2845 согласована — Козлова Е.В.",     type: "success" },
  { id: 3, time: "14:30", text: "Реестр 18.06.2026 сформирован (5 заявок)",     type: "info"    },
  { id: 4, time: "15:00", text: "⚠ Кассовый разрыв 27 июня: −240 000 ₽",       type: "danger"  },
  { id: 5, time: "15:40", text: "Платёж № 2847 перенесён: 29.06 → 26.06",       type: "success" },
];

const EVENT_COLORS = {
  success: { bg: C.sage10,   color: C.sage,   dot: C.sage   },
  info:    { bg: C.olive20,  color: C.olive,  dot: C.olive  },
  danger:  { bg: C.danger12, color: C.danger, dot: C.danger },
};
/* ──────────────────────────────────────────────────────────── */

function ruFmt2(n: number): string {
  return (n < 0 ? "−" : "") + ruFmt(Math.abs(n)) + " ₽";
}

export function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // STUB: simulate API loading (remove in production)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const today = "26 июня 2026, суббота";

  return (
    <div
      style={{
        padding: 28,
        fontFamily: "Inter, sans-serif",
        overflowY: "auto",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textDk, margin: 0 }}>
          Добро пожаловать{user ? `, ${user.name.split(" ")[0]} ${user.name.split(" ")[1] ?? ""}` : ""}
        </h1>
        <p style={{ fontSize: 13, color: C.textLt, margin: "4px 0 0" }}>{today}</p>
      </div>

      {loading ? <DashboardSkeleton /> : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatCard
              label="Общий остаток"
              value={ruFmt2(SUMMARY.totalBalance)}
              valueColor={C.sage}
              icon={<TrendingUp size={18} color={C.sage} />}
              bg={C.sage10}
            />
            <StatCard
              label="Ближайший разрыв"
              value={ruFmt2(SUMMARY.nearestGapAmount)}
              valueColor={C.danger}
              sub={SUMMARY.nearestGapDate}
              icon={<AlertTriangle size={18} color={C.danger} />}
              bg={C.danger12}
            />
            <StatCard
              label="Ожидают согласования"
              value={String(SUMMARY.pendingCount)}
              valueSuffix=" заявок"
              valueColor={C.olive}
              icon={<Clock size={18} color={C.olive} />}
              bg={C.olive20}
            />
            <StatCard
              label="Платежей сегодня"
              value={ruFmt2(SUMMARY.todayPayments)}
              valueColor={C.danger}
              icon={<ArrowDownCircle size={18} color={C.danger} />}
              bg={C.danger08}
            />
            <StatCard
              label="Поступлений сегодня"
              value={ruFmt2(SUMMARY.todayIncome)}
              valueColor={C.sage}
              icon={<ArrowUpCircle size={18} color={C.sage} />}
              bg={C.sage10}
            />
          </div>

          {/* ── Bottom row: chart + recent events ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

            {/* Balance chart */}
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.warm}`,
                borderRadius: 10,
                padding: "20px 20px 12px",
                boxShadow: "0 1px 4px rgba(44,44,30,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDk, margin: 0 }}>
                  Остаток по дням — Июнь 2026
                </h3>
                <span style={{ fontSize: 11, color: C.textLt }}>Итого по всем счетам</span>
              </div>
              <SvgBarChart data={BALANCE_CHART} height={220} />
              <div style={{ display: "flex", gap: 16, marginTop: 8, paddingLeft: 4 }}>
                <LegendDot color={C.sage}   label="Положительный" />
                <LegendDot color={C.danger} label="Кассовый разрыв" />
                <LegendDot color={C.warm}   label="Нулевой" />
              </div>
            </div>

            {/* Recent events */}
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.warm}`,
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(44,44,30,0.08)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.warm}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDk, margin: 0 }}>
                  Последние события
                </h3>
                <span style={{ fontSize: 11, color: C.textLt }}>26 июня 2026</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {RECENT_EVENTS.map(ev => {
                  const ec = EVENT_COLORS[ev.type as keyof typeof EVENT_COLORS] ?? EVENT_COLORS.info;
                  return (
                    <div
                      key={ev.id}
                      style={{
                        padding: "10px 18px",
                        borderBottom: `1px solid rgba(192,192,160,0.28)`,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: ec.dot, flexShrink: 0, marginTop: 5,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: C.textDk, lineHeight: 1.4 }}>{ev.text}</div>
                        <div style={{ fontSize: 10, color: C.textLt, marginTop: 2 }}>{ev.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Чистый SVG-график без recharts ─────────────────────────
 * Заменяет recharts BarChart, который генерировал duplicate-key warnings.
 * Показывает остатки по дням: зелёный = положительный, красный = разрыв.
 * ─────────────────────────────────────────────────────────── */
interface SvgBarChartProps {
  data:   { date: string; balance: number }[];
  height: number;
}

function SvgBarChart({ data, height }: SvgBarChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; date: string } | null>(null);

  const W       = 520;
  const PAD_L   = 40;
  const PAD_B   = 28;
  const PAD_T   = 8;
  const chartW  = W - PAD_L - 8;
  const chartH  = height - PAD_B - PAD_T;
  const n       = data.length;
  const slot    = chartW / n;
  const barW    = Math.min(slot * 0.6, 36);

  const maxAbs = Math.max(...data.map(d => Math.abs(d.balance)), 1);
  const zeroY  = PAD_T + chartH / 2;
  const scale  = (chartH / 2 - 4) / maxAbs;

  const yTicks = [-maxAbs * 0.75, -maxAbs * 0.375, 0, maxAbs * 0.375, maxAbs * 0.75];

  const barColor = (v: number) => v < 0 ? C.danger : v === 0 ? C.warm : C.sage;

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        style={{ display: "block", fontFamily: "Inter, sans-serif" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Horizontal grid lines */}
        {yTicks.map((v, i) => {
          const y = zeroY - v * scale;
          return (
            <g key={`grid-${i}`}>
              <line x1={PAD_L} y1={y} x2={W - 8} y2={y}
                stroke={v === 0 ? C.warm : "rgba(192,192,160,0.3)"}
                strokeWidth={v === 0 ? 1.5 : 1}
                strokeDasharray={v === 0 ? undefined : "3 3"} />
              <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill={C.textLt}>
                {`${(v / 1000).toFixed(0)}k`}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx  = PAD_L + i * slot + slot / 2;
          const bx  = cx - barW / 2;
          const h   = Math.max(Math.abs(d.balance) * scale, 2);
          const by  = d.balance >= 0 ? zeroY - h : zeroY;
          const fill = barColor(d.balance);
          const labelY = height - PAD_B + 14;
          return (
            <g key={`bar-${i}`}
              onMouseEnter={e => {
                const svgRect = ref.current?.getBoundingClientRect();
                if (!svgRect) return;
                const relX = (e.clientX - svgRect.left) / svgRect.width * W;
                const relY = (e.clientY - svgRect.top) / svgRect.height * height;
                setTooltip({ x: relX, y: relY, value: d.balance, date: d.date });
              }}>
              <rect x={bx} y={by} width={barW} height={h} fill={fill} rx={3} opacity={0.92} />
              <text x={cx} y={labelY} textAnchor="middle" fontSize={10} fill={C.textLt}>
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: `${(tooltip.x / W) * 100}%`,
          top: `${(tooltip.y / height) * 100}%`,
          transform: "translate(-50%, -110%)",
          background: C.surface,
          border: `1px solid ${C.warm}`,
          borderRadius: 6,
          padding: "5px 10px",
          fontSize: 12,
          color: C.textDk,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(44,44,30,0.12)",
          zIndex: 10,
        }}>
          <strong>{tooltip.date}</strong>: {ruFmt2(tooltip.value)}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function StatCard({
  label, value, valueSuffix, sub, valueColor, icon, bg,
}: {
  label: string; value: string; valueSuffix?: string;
  sub?: string; valueColor: string; icon: React.ReactNode; bg: string;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.warm}`,
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 1px 4px rgba(44,44,30,0.07)",
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: bg, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textLt, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: valueColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
          {value}
          {valueSuffix && <span style={{ fontSize: 12, fontWeight: 400, color: C.textLt }}>{valueSuffix}</span>}
        </div>
        {sub && <div style={{ fontSize: 11, color: C.textLt, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: C.textLt }}>{label}</span>
    </div>
  );
}

/* ── Skeleton loader ─────────────────────────────────────── */
function DashboardSkeleton() {
  const pulse: React.CSSProperties = {
    background: `linear-gradient(90deg, ${C.ivory} 25%, ${C.warm} 50%, ${C.ivory} 75%)`,
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
    borderRadius: 6,
  };
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, padding: 16 }}>
            <div style={{ ...pulse, width: 36, height: 36, borderRadius: 8, marginBottom: 12 }} />
            <div style={{ ...pulse, height: 10, width: "70%", marginBottom: 8 }} />
            <div style={{ ...pulse, height: 20, width: "90%" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, height: 300, ...pulse }} />
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, height: 300, ...pulse }} />
      </div>
    </>
  );
}
