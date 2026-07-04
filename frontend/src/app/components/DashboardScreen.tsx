import { useState, useEffect, useRef } from "react";
import { AlertTriangle, TrendingUp, Clock, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { C } from "../tokens";
import { useAuth } from "../context/AuthContext";
import { ruFmt, kopecksToRub } from "../utils";
import * as api from "../../api";

const MONTH_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DAY_RU = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function ruFmt2(n: number): string {
  return (n < 0 ? "−" : "") + ruFmt(Math.abs(n)) + " ₽";
}

export function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalBalance: 0, nearestGapDate: "", nearestGapAmount: 0, pendingCount: 0, todayPayments: 0, todayIncome: 0 });
  const [chartData, setChartData] = useState<{ date: string; balance: number }[]>([]);
  const [events, setEvents] = useState<{ id: number; time: string; text: string; type: string }[]>([]);

  useEffect(() => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const weekAgo = new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10);

    Promise.all([
      api.accounts.getAll().catch(() => []),
      api.payments.getAll().catch(() => []),
      api.incomes.getAll().catch(() => []),
      api.calendar.get({ start_date: weekAgo, end_date: todayISO }).catch(() => []),
      api.audit.getAll({ per_page: 5 }).catch(() => ({ data: [] })),
    ]).then(([accounts, payments, incomes, calendar, audit]) => {
      // Summary — все суммы конвертируем из копеек в рубли
      const totalBalance = (accounts as any[]).reduce((s: number, a: any) => s + kopecksToRub(a.current || 0), 0);
      const pendingCount = (payments as any[]).filter((p: any) => p.status === "pending").length;
      const todayPayments = (payments as any[]).filter((p: any) => p.planned_date === todayISO).reduce((s: number, p: any) => s + kopecksToRub(p.amount || 0), 0);
      const todayIncome = (incomes as any[]).filter((i: any) => i.planned_date === todayISO).reduce((s: number, i: any) => s + kopecksToRub(i.amount || 0), 0);

      // Find nearest cash gap
      const gapDays = (calendar as any[]).filter((d: any) => d.has_cash_gap && d.account_id === null);
      const nearestGap = gapDays.length > 0 ? gapDays[0] : null;

      setSummary({
        totalBalance,
        nearestGapDate: nearestGap ? `${new Date(nearestGap.date + "T12:00:00").getDate()} ${MONTH_RU[new Date(nearestGap.date + "T12:00:00").getMonth()]}` : "Нет разрывов",
        nearestGapAmount: nearestGap ? kopecksToRub(nearestGap.closing_balance) : 0,
        pendingCount,
        todayPayments,
        todayIncome,
      });

      // Chart data — summary rows from calendar (конвертируем в рубли)
      const summaryRows = (calendar as any[]).filter((d: any) => d.account_id === null);
      setChartData(summaryRows.map((d: any) => {
        const dt = new Date(d.date + "T12:00:00");
        return { date: `${dt.getDate()} ${MONTH_RU[dt.getMonth()].slice(0, 3)}`, balance: kopecksToRub(d.closing_balance) };
      }));

      // Events from audit
      const ROLE_LABELS: Record<string, string> = { admin: "Администратор", initiator: "Инициатор", manager: "Руководитель", treasurer: "Казначей" };
      setEvents(((audit as any).data || []).map((e: any, i: number) => ({
        id: e.id || i + 1,
        time: e.timestamp ? e.timestamp.split(" ")[1]?.slice(0, 5) || "" : "",
        text: `${e.action?.replace(/_/g, " ") || ""} — ${e.object || ""}`,
        type: e.action?.includes("reject") || e.action?.includes("gap") ? "danger" : e.action?.includes("approv") || e.action?.includes("paid") ? "success" : "info",
      })));
    }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const today = `${now.getDate()} ${MONTH_RU[now.getMonth()]} ${now.getFullYear()}, ${DAY_RU[now.getDay()]}`;

  return (
    <div style={{ padding: 28, fontFamily: "Inter, sans-serif", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textDk, margin: 0 }}>
          Добро пожаловать{user ? `, ${user.name.split(" ")[0]} ${user.name.split(" ")[1] ?? ""}` : ""}
        </h1>
        <p style={{ fontSize: 13, color: C.textLt, margin: "4px 0 0" }}>{today}</p>
      </div>

      {loading ? <DashboardSkeleton /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatCard label="Общий остаток" value={ruFmt2(summary.totalBalance)} valueColor={C.sage} icon={<TrendingUp size={18} color={C.sage} />} bg={C.sage10} />
            <StatCard label="Ближайший разрыв" value={ruFmt2(summary.nearestGapAmount)} valueColor={C.danger} sub={summary.nearestGapDate} icon={<AlertTriangle size={18} color={C.danger} />} bg={C.danger12} />
            <StatCard label="Ожидают согласования" value={String(summary.pendingCount)} valueSuffix=" заявок" valueColor={C.olive} icon={<Clock size={18} color={C.olive} />} bg={C.olive20} />
            <StatCard label="Платежей сегодня" value={ruFmt2(summary.todayPayments)} valueColor={C.danger} icon={<ArrowDownCircle size={18} color={C.danger} />} bg={C.danger08} />
            <StatCard label="Поступлений сегодня" value={ruFmt2(summary.todayIncome)} valueColor={C.sage} icon={<ArrowUpCircle size={18} color={C.sage} />} bg={C.sage10} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, padding: "20px 20px 12px", boxShadow: "0 1px 4px rgba(44,44,30,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDk, margin: 0 }}>Остаток по дням</h3>
                <span style={{ fontSize: 11, color: C.textLt }}>Итого по всем счетам</span>
              </div>
              {chartData.length > 0 ? <SvgBarChart data={chartData} height={220} /> : <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.textLt, fontSize: 13 }}>Нет данных за период</div>}
              <div style={{ display: "flex", gap: 16, marginTop: 8, paddingLeft: 4 }}>
                <LegendDot color={C.sage} label="Положительный" /><LegendDot color={C.danger} label="Кассовый разрыв" /><LegendDot color={C.warm} label="Нулевой" />
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(44,44,30,0.08)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.warm}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDk, margin: 0 }}>Последние события</h3>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {events.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.textLt, fontSize: 13 }}>Нет событий</div>}
                {events.map(ev => {
                  const ec = ev.type === "success" ? { bg: C.sage10, color: C.sage, dot: C.sage } : ev.type === "danger" ? { bg: C.danger12, color: C.danger, dot: C.danger } : { bg: C.olive20, color: C.olive, dot: C.olive };
                  return (
                    <div key={ev.id} style={{ padding: "10px 18px", borderBottom: `1px solid rgba(192,192,160,0.28)`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ec.dot, flexShrink: 0, marginTop: 5 }} />
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

function SvgBarChart({ data, height }: { data: { date: string; balance: number }[]; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; date: string } | null>(null);
  const W = 520, PAD_L = 40, PAD_B = 28, PAD_T = 8;
  const chartW = W - PAD_L - 8, chartH = height - PAD_B - PAD_T;
  const n = data.length, slot = chartW / n, barW = Math.min(slot * 0.6, 36);
  const maxAbs = Math.max(...data.map(d => Math.abs(d.balance)), 1);
  const zeroY = PAD_T + chartH / 2, scale = (chartH / 2 - 4) / maxAbs;
  const barColor = (v: number) => v < 0 ? C.danger : v === 0 ? C.warm : C.sage;

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", fontFamily: "Inter, sans-serif" }} onMouseLeave={() => setTooltip(null)}>
        {[-maxAbs * 0.75, -maxAbs * 0.375, 0, maxAbs * 0.375, maxAbs * 0.75].map((v, i) => {
          const y = zeroY - v * scale;
          return <g key={i}><line x1={PAD_L} y1={y} x2={W - 8} y2={y} stroke={v === 0 ? C.warm : "rgba(192,192,160,0.3)"} strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? undefined : "3 3"} /><text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill={C.textLt}>{`${(v / 1000).toFixed(0)}k`}</text></g>;
        })}
        {data.map((d, i) => {
          const cx = PAD_L + i * slot + slot / 2, bx = cx - barW / 2;
          const h = Math.max(Math.abs(d.balance) * scale, 2);
          const by = d.balance >= 0 ? zeroY - h : zeroY;
          return <g key={i} onMouseEnter={e => { const r = ref.current?.getBoundingClientRect(); if (r) setTooltip({ x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * height, value: d.balance, date: d.date }); }}>
            <rect x={bx} y={by} width={barW} height={h} fill={barColor(d.balance)} rx={3} opacity={0.92} />
            <text x={cx} y={height - PAD_B + 14} textAnchor="middle" fontSize={10} fill={C.textLt}>{d.date}</text>
          </g>;
        })}
      </svg>
      {tooltip && <div style={{ position: "absolute", left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / height) * 100}%`, transform: "translate(-50%, -110%)", background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 6, padding: "5px 10px", fontSize: 12, color: C.textDk, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(44,44,30,0.12)", zIndex: 10 }}><strong>{tooltip.date}</strong>: {ruFmt2(tooltip.value)}</div>}
    </div>
  );
}

function StatCard({ label, value, valueSuffix, sub, valueColor, icon, bg }: { label: string; value: string; valueSuffix?: string; sub?: string; valueColor: string; icon: React.ReactNode; bg: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 1px 4px rgba(44,44,30,0.07)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: C.textLt, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: valueColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{value}{valueSuffix && <span style={{ fontSize: 12, fontWeight: 400, color: C.textLt }}>{valueSuffix}</span>}</div>
        {sub && <div style={{ fontSize: 11, color: C.textLt, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} /><span style={{ fontSize: 11, color: C.textLt }}>{label}</span></div>;
}

function DashboardSkeleton() {
  const pulse: React.CSSProperties = { background: `linear-gradient(90deg, ${C.ivory} 25%, ${C.warm} 50%, ${C.ivory} 75%)`, backgroundSize: "200% 100%", animation: "pulse 1.4s ease-in-out infinite", borderRadius: 6 };
  return (
    <>
      <style>{`@keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, padding: 16 }}><div style={{ ...pulse, width: 36, height: 36, borderRadius: 8, marginBottom: 12 }} /><div style={{ ...pulse, height: 10, width: "70%", marginBottom: 8 }} /><div style={{ ...pulse, height: 20, width: "90%" }} /></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, height: 300, ...pulse }} />
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, height: 300, ...pulse }} />
      </div>
    </>
  );
}
