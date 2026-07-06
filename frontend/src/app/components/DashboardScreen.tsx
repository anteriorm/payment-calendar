/**
 * DashboardScreen — Главная / Обзорный экран.
 * Данные загружаются из GET /api/dashboard.
 */

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, TrendingUp, Clock, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { C } from "../tokens";
import { useAuth } from "../context/AuthContext";
import { kopecksToRub, formatRub } from "../utils";
import * as api from "../../api";

interface DashboardSummary {
  totalBalance: number;
  nearestGapDate: string | null;
  nearestGapAmount: number;
  pendingCount: number;
  todayPayments: number;
  todayIncome: number;
}

interface ChartPoint {
  date: string;
  balance: number;
}

interface EventItem {
  id: number;
  time: string;
  text: string;
  type: string;
}

const EVENT_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  success: { bg: C.sage10,   color: C.sage,   dot: C.sage   },
  info:    { bg: C.olive20,  color: C.olive,  dot: C.olive  },
  danger:  { bg: C.danger12, color: C.danger, dot: C.danger },
};

function ruFmt2(n: number): string {
  return formatRub(n);
}

export function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    api.dashboard.get()
      .then((data: any) => {
        setSummary(data.summary);
        setChart(data.chart);
        setEvents(data.events);
      })
      .catch(() => {
        // fallback на пустые данные
        setSummary({ totalBalance: 0, nearestGapDate: null, nearestGapAmount: 0, pendingCount: 0, todayPayments: 0, todayIncome: 0 });
        setChart([]);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

  const s = summary ?? { totalBalance: 0, nearestGapDate: null, nearestGapAmount: 0, pendingCount: 0, todayPayments: 0, todayIncome: 0 };

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
              value={ruFmt2(s.totalBalance)}
              valueColor={C.sage}
              icon={<TrendingUp size={18} color={C.sage} />}
              bg={C.sage10}
            />
            <StatCard
              label="Ближайший разрыв"
              value={s.nearestGapDate ? ruFmt2(s.nearestGapAmount) : "Нет"}
              valueColor={C.danger}
              sub={s.nearestGapDate ?? "Разрывов нет"}
              icon={<AlertTriangle size={18} color={C.danger} />}
              bg={C.danger12}
            />
            <StatCard
              label="Ожидают согласования"
              value={String(s.pendingCount)}
              valueSuffix=" заявок"
              valueColor={C.olive}
              icon={<Clock size={18} color={C.olive} />}
              bg={C.olive20}
              showRubNote={false}
            />
            <StatCard
              label="Платежей сегодня"
              value={ruFmt2(s.todayPayments)}
              valueColor={C.danger}
              icon={<ArrowDownCircle size={18} color={C.danger} />}
              bg={C.danger08}
            />
            <StatCard
              label="Поступлений сегодня"
              value={ruFmt2(s.todayIncome)}
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
                  Остаток по дням
                </h3>
                <span style={{ fontSize: 11, color: C.textLt }}>Итого по всем счетам</span>
              </div>
              <SvgBarChart data={chart.map(c => ({ ...c, balance: kopecksToRub(c.balance) }))} height={220} />
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
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {events.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: C.textLt, fontSize: 13 }}>Нет событий</div>
                )}
                {events.map(ev => {
                  const ec = EVENT_COLORS[ev.type] ?? EVENT_COLORS.info;
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

/* ── SVG Bar Chart ─────────────────────────────────────── */
interface SvgBarChartProps {
  data:   { date: string; balance: number }[];
  height: number;
}

function SvgBarChart({ data, height }: SvgBarChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; date: string } | null>(null);

  if (data.length === 0) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: C.textLt, fontSize: 13 }}>Нет данных</div>;

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
        {yTicks.map((v, i) => {
          const y = zeroY - v * scale;
          return (
            <g key={`grid-${i}`}>
              <line x1={PAD_L} y1={y} x2={W - 8} y2={y}
                stroke={v === 0 ? C.warm : "rgba(192,192,160,0.3)"}
                strokeWidth={v === 0 ? 1.5 : 1}
                strokeDasharray={v === 0 ? undefined : "3 3"} />
              <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill={C.textLt}>
                {v === 0 ? "0" : `${(v / 1000).toFixed(0)} тыс.`}
              </text>
            </g>
          );
        })}

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
          <strong>{tooltip.date}</strong>: {formatRub(Math.round(tooltip.value * 100))}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */
function StatCard({
  label, value, valueSuffix, sub, valueColor, icon, bg, showRubNote = true,
}: {
  label: string; value: string; valueSuffix?: string;
  sub?: string; valueColor: string; icon: ReactNode; bg: string;
  showRubNote?: boolean;
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
        {showRubNote && <div style={{ fontSize: 10, color: C.textLt, opacity: 0.65, marginTop: 2 }}>RUB-экв.</div>}
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
  const pulse: CSSProperties = {
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
