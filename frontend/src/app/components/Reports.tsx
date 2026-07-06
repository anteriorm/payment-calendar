import { useState, useEffect, useRef, type ReactElement } from "react";
import { BarChart2, AlertTriangle, ArrowUpRight, Calendar, ChevronDown, Download } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv, formatRub } from "../utils";
import * as api from "../../api";

type TabId = "cashgaps" | "balances" | "planfact" | "exports";

interface ReportsProps {
  onGoToCalendar?: () => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "balances",  label: "Остатки по счетам" },
  { id: "cashgaps",  label: "Кассовые разрывы"  },
  { id: "planfact",  label: "План и факт"        },
  { id: "exports",   label: "Выгрузки"           },
];

/* ── Data ──────────────────────────────────────────── */
interface CashGap {
  date: string; account: string; deficit: number;
  topPayer: string; topAmount: number;
}

interface BalanceRow {
  name: string; opening: number; income: number; expense: number; closing: number; isTotal?: boolean;
}

const MONTH_NOM_FULL = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

const EXPORT_TYPES = [
  { id: "balances",  name: "Остатки по счетам",         icon: "📊" },
  { id: "cashgaps",  name: "Кассовые разрывы",          icon: "⚠️" },
  { id: "planfact",  name: "План и факт",               icon: "📈" },
];

/* ── Helpers ───────────────────────────────────────── */
function parseRuDate(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2]-1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}
function toISO(s: string): string {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
}
function fromISO(s: string): string {
  if (!s) return "";
  const [y, mo, d] = s.split("-");
  return `${d}.${mo}.${y}`;
}

function fmtFull(n: number): string {
  return formatRub(n);
}
function fmtShort(n: number): string {
  return formatRub(n);
}

/* ── Main component ────────────────────────────────── */
export function Reports({ onGoToCalendar }: ReportsProps) {
  const [tab, setTab] = useState<TabId>("cashgaps");
  const { showToast } = useToast();

  const handleExport = () => {
    showToast("Используйте кнопку «Выгрузить в Excel» на каждой вкладке", "info");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>

      {/* ── Page header + tabs ── */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.warm}`,
          padding: "18px 24px 0",
          flexShrink: 0,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textDk, margin: "0 0 16px" }}>
          Отчёты
        </h1>

        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  padding: "8px 20px",
                  borderRadius: active ? "6px 6px 0 0" : 6,
                  border: "none",
                  background: active ? C.sage : C.ivory,
                  color: active ? C.surface : C.textLt,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  position: "relative",
                  bottom: active ? -1 : 0,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "cashgaps" && (
          <CashGapsTab onGoToCalendar={onGoToCalendar} onExport={handleExport} />
        )}
        {tab === "balances" && <BalancesTab />}
        {tab === "planfact" && <PlanFactTab onExport={handleExport} />}
        {tab === "exports"  && <ExportsTab />}
      </div>
    </div>
  );
}

/* ── Tab: Кассовые разрывы ─────────────────────────── */
function CashGapsTab({
  onGoToCalendar,
  onExport,
}: { onGoToCalendar?: () => void; onExport: () => void }) {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = `${String(weekEnd.getDate()).padStart(2,'0')}.${String(weekEnd.getMonth()+1).padStart(2,'0')}.${weekEnd.getFullYear()}`;
  const [period,   setPeriod]   = useState("week");
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo,   setDateTo]   = useState(weekEndStr);
  const [gaps,     setGaps]     = useState<CashGap[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    let from: string, to: string;
    if (period === "week") {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay() + 1);
      from = d.toISOString().split('T')[0];
      const e = new Date(d); e.setDate(e.getDate() + 6);
      to = e.toISOString().split('T')[0];
    } else if (period === "month") {
      from = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
      to = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()}`;
    } else if (period === "quarter") {
      const qm = Math.floor(today.getMonth() / 3) * 3;
      from = `${today.getFullYear()}-${String(qm+1).padStart(2,'0')}-01`;
      to = `${today.getFullYear()}-${String(qm+3).padStart(2,'0')}-${new Date(today.getFullYear(), qm+3, 0).getDate()}`;
    } else {
      const parts = dateFrom.split('.'); from = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const parts2 = dateTo.split('.'); to = `${parts2[2]}-${parts2[1]}-${parts2[0]}`;
    }
    api.reports.getCashGaps({ date_from: from, date_to: to })
      .then(data => setGaps((data as any[]).map(g => ({
        date: g.date ? new Date(g.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
        account: g.account ?? '', deficit: g.deficit ?? 0,
        topPayer: g.top_payer ?? '', topAmount: g.top_amount ?? 0,
      }))))
      .catch(() => setGaps([]))
      .finally(() => setLoading(false));
  }, [period, dateFrom, dateTo]);

  const filteredGaps = gaps;
  const totalDeficit = filteredGaps.reduce((s, g) => s + g.deficit, 0);
  const gapWord = filteredGaps.length === 1 ? "разрыв" : filteredGaps.length < 5 ? "разрыва" : "разрывов";

  return (
    <div style={{ padding: 24 }}>

      {/* Filter bar */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.warm}`,
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Period select */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: "7px 28px 7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", appearance: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <option value="week">Текущая неделя</option>
            <option value="month">Текущий месяц</option>
            <option value="quarter">Квартал (Q2)</option>
            <option value="custom">Произвольный</option>
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
            <ChevronDown size={13} />
          </div>
        </div>

        {/* Date range — always visible, enabled only in custom */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: period === "custom" ? 1 : 0.45 }}>
          <DateInput value={dateFrom} onChange={setDateFrom} disabled={period !== "custom"} />
          <span style={{ fontSize: 12, color: C.textLt }}>—</span>
          <DateInput value={dateTo}   onChange={setDateTo}   disabled={period !== "custom"} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Summary chip */}
        {filteredGaps.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: C.danger12, border: `1px solid ${C.danger}` }}>
            <AlertTriangle size={13} color={C.danger} />
            <span style={{ fontSize: 12, color: C.danger, fontWeight: 500 }}>
              {filteredGaps.length} кассовых {gapWord} · {fmtFull(totalDeficit)}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: C.sage10, border: `1px solid ${C.sage}` }}>
            <span style={{ fontSize: 12, color: C.sage, fontWeight: 500 }}>Разрывов в периоде нет</span>
          </div>
        )}

        <ExcelBtn onClick={onExport} />
      </div>

      {/* Cards */}
      {filteredGaps.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredGaps.map((gap, i) => (
            <CashGapCard key={i} gap={gap} onGoToCalendar={onGoToCalendar} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.textLt, fontSize: 14 }}>
          В выбранном периоде кассовых разрывов не обнаружено
        </div>
      )}
    </div>
  );
}

/* ── DateInput — text + native picker ─────────────── */
function DateInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="дд.мм.гггг"
        style={{
          width: 118,
          padding: "7px 30px 7px 10px",
          border: `1px solid ${C.warm}`,
          borderRadius: 6,
          background: C.surface,
          fontSize: 13,
          color: C.textDk,
          outline: "none",
          fontFamily: "Inter, sans-serif",
        }}
      />
      <input
        ref={ref}
        type="date"
        value={toISO(value)}
        onChange={e => onChange(fromISO(e.target.value))}
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none", border: "none" }}
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => (ref.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.()}
        style={{
          position: "absolute",
          right: 6,
          background: "none",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          color: C.olive,
          display: "flex",
          padding: 2,
        }}
      >
        <Calendar size={14} />
      </button>
    </div>
  );
}

function CashGapCard({
  gap,
  onGoToCalendar,
}: { gap: CashGap; onGoToCalendar?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.surface,
        borderRadius: "0 8px 8px 0",
        borderTop:    `1px solid ${hov ? C.danger : C.warm}`,
        borderRight:  `1px solid ${hov ? C.danger : C.warm}`,
        borderBottom: `1px solid ${hov ? C.danger : C.warm}`,
        borderLeft:   `4px solid ${C.danger}`,
        padding: "16px 20px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 20,
        boxShadow: hov ? "0 1px 6px rgba(192,80,74,0.14)" : "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>

        {/* Date + account row */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: C.textLt, marginBottom: 2 }}>Дата</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textDk }}>{gap.date}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textLt, marginBottom: 2 }}>Счёт</div>
            <div style={{ fontSize: 13, color: C.textDk }}>{gap.account}</div>
          </div>
        </div>

        {/* Deficit */}
        <div>
          <div style={{ fontSize: 11, color: C.textLt, marginBottom: 3 }}>Дефицит</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.danger, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
            {fmtFull(gap.deficit, gap.account)}
          </div>
        </div>

        {/* Top payment */}
        <div style={{ padding: "8px 12px", background: C.danger08, borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={13} color={C.danger} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.textLt }}>Крупнейший платёж дня: </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textDk }}>{gap.topPayer}</span>
          <span style={{ fontSize: 12, color: C.textLt }}> — </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.danger, fontVariantNumeric: "tabular-nums" }}>
            {fmtShort(gap.topAmount, gap.account)}
          </span>
        </div>
      </div>

      {/* Right */}
      <div style={{ flexShrink: 0, paddingTop: 4 }}>
        <GoToCalBtn onClick={onGoToCalendar} />
      </div>
    </div>
  );
}

/* ── Tab: Остатки по счетам ────────────────────────── */
function BalancesTab() {
  const { showToast } = useToast();
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = `${String(weekEnd.getDate()).padStart(2,'0')}.${String(weekEnd.getMonth()+1).padStart(2,'0')}.${weekEnd.getFullYear()}`;
  const [period,   setPeriod]   = useState("week");
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo,   setDateTo]   = useState(weekEndStr);
  const [rows,     setRows]     = useState<BalanceRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    let from: string, to: string;
    if (period === "week") {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay() + 1);
      from = d.toISOString().split('T')[0];
      const e = new Date(d); e.setDate(e.getDate() + 6);
      to = e.toISOString().split('T')[0];
    } else if (period === "month") {
      from = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
      to = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()}`;
    } else if (period === "quarter") {
      const qm = Math.floor(today.getMonth() / 3) * 3;
      from = `${today.getFullYear()}-${String(qm+1).padStart(2,'0')}-01`;
      to = `${today.getFullYear()}-${String(qm+3).padStart(2,'0')}-${new Date(today.getFullYear(), qm+3, 0).getDate()}`;
    } else {
      const parts = dateFrom.split('.'); from = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const parts2 = dateTo.split('.'); to = `${parts2[2]}-${parts2[1]}-${parts2[0]}`;
    }
    api.reports.getBalances({ date_from: from, date_to: to })
      .then(data => setRows((data as any[]).map(r => ({
        name: r.account ?? r.name ?? '',
        opening: r.opening ?? 0,
        income: r.income ?? 0,
        expense: r.expense ?? 0,
        closing: r.closing ?? 0,
        isTotal: r.is_total ?? false,
      }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period, dateFrom, dateTo]);

  const handleExport = () => {
    exportCsv(
      "Остатки_по_счетам.csv",
      ["Счёт", "Остаток на начало", "Приход", "Расход", "Остаток на конец"],
      rows.map(r => [r.name + (r.isTotal ? " (RUB-экв.)" : ""), fmtShort(r.opening, r.name), fmtShort(r.income, r.name), fmtShort(r.expense, r.name), fmtShort(r.closing, r.name)]),
    );
    showToast("Остатки_по_счетам.csv скачан", "success");
  };

  const formatPeriodLabel = (): string => {
    const today = new Date();
    if (period === "week") {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay() + 1);
      const e = new Date(d); e.setDate(e.getDate() + 6);
      return `${d.toLocaleDateString('ru-RU')} — ${e.toLocaleDateString('ru-RU')}`;
    }
    if (period === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return `${start.toLocaleDateString('ru-RU')} — ${end.toLocaleDateString('ru-RU')}`;
    }
    if (period === "quarter") {
      const qm = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), qm, 1);
      const end = new Date(today.getFullYear(), qm + 3, 0);
      return `${start.toLocaleDateString('ru-RU')} — ${end.toLocaleDateString('ru-RU')}`;
    }
    return `${dateFrom} — ${dateTo}`;
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Filter bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Period select */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: "7px 28px 7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", appearance: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <option value="week">Текущая неделя</option>
            <option value="month">Текущий месяц</option>
            <option value="quarter">Квартал (Q2)</option>
            <option value="custom">Произвольный</option>
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
            <ChevronDown size={13} />
          </div>
        </div>

        {/* Date range — active only in custom mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: period === "custom" ? 1 : 0.45 }}>
          <DateInput value={dateFrom} onChange={setDateFrom} disabled={period !== "custom"} />
          <span style={{ fontSize: 12, color: C.textLt }}>—</span>
          <DateInput value={dateTo}   onChange={setDateTo}   disabled={period !== "custom"} />
        </div>

        <div style={{ flex: 1 }} />
        <ExcelBtn onClick={handleExport} />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.hdr }}>
              {["Счёт", "Остаток на начало", "Приход", "Расход", "Остаток на конец"].map(col => (
                <th key={col} style={{ padding: "11px 16px", textAlign: col === "Счёт" ? "left" : "right", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <BalanceRow key={row.name} row={row} i={i} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: C.textLt }}>
        Период: {formatPeriodLabel()}
      </div>
    </div>
  );
}

function BalanceRow({ row, i }: { row: BalanceRow; i: number }) {
  const [hov, setHov] = useState(false);
  const base = row.isTotal ? C.hdr : i % 2 === 0 ? C.surface : C.ivory50;
  const bg   = !row.isTotal && hov ? C.beige30 : base;
  const closingColor = row.closing < row.opening ? C.danger : row.closing > row.opening ? C.sage : C.textDk;

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: bg, transition: "background 0.1s", borderBottom: `1px solid rgba(192,192,160,0.35)` }}
    >
      <td style={{ padding: "12px 16px", color: C.textDk, fontWeight: row.isTotal ? 700 : 600, whiteSpace: "nowrap" }}>
        {row.name}
        {row.isTotal && <span style={{ fontSize: 10, color: C.textLt, fontWeight: 400, marginLeft: 5 }}>RUB-экв.</span>}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: C.textDk, fontWeight: row.isTotal ? 700 : 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {fmtShort(row.opening, row.name)}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: C.sage, fontWeight: row.isTotal ? 700 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        ↑ {fmtShort(row.income, row.name)}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: C.danger, fontWeight: row.isTotal ? 700 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        ↓ {fmtShort(row.expense, row.name)}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: row.isTotal ? C.textDk : closingColor, fontWeight: row.isTotal ? 700 : 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {fmtShort(row.closing, row.name)}
        {!row.isTotal && (
          <span style={{ fontSize: 11, marginLeft: 5, opacity: 0.8 }}>
            {row.closing > row.opening ? "▲" : row.closing < row.opening ? "▼" : ""}
          </span>
        )}
      </td>
    </tr>
  );
}

/* ── Tab: План и факт ──────────────────────────────── */
function PlanFactTab({ onExport }: { onExport: () => void }) {
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear,  setSelYear]  = useState(new Date().getFullYear());
  const [rows,     setRows]     = useState<{ article: string; budget: number; fact: number }[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const from = `${selYear}-${String(selMonth+1).padStart(2,'0')}-01`;
    const to = `${selYear}-${String(selMonth+1).padStart(2,'0')}-${new Date(selYear, selMonth+1, 0).getDate()}`;
    api.reports.getPlanFact({ date_from: from, date_to: to })
      .then(data => setRows((data as any[]).map(r => ({ article: r.item ?? r.article ?? '', budget: r.budget ?? 0, fact: r.fact ?? 0 }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selMonth, selYear]);

  const prevMonth = () => {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1); }
    else setSelMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1); }
    else setSelMonth(m => m + 1);
  };
  const prevYear  = () => setSelYear(y => y - 1);
  const nextYear  = () => setSelYear(y => y + 1);
  const goToday   = () => { setSelMonth(5); setSelYear(2026); };

  const isToday = selMonth === new Date().getMonth() && selYear === new Date().getFullYear();
  const isRealData = rows.length > 0;

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalFact   = rows.reduce((s, r) => s + r.fact,   0);
  const totalDiff   = totalFact - totalBudget;
  const totalPct    = totalBudget > 0 ? Math.round((totalFact / totalBudget) * 100) : 0;

  const navBtn = (label: string, onClick: () => void, title?: string): ReactElement => (
    <button onClick={onClick} title={title}
      style={{ padding: "5px 9px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, color: C.textLt, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center" }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* ── Month/Year navigator ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {navBtn("«", prevYear,  "Предыдущий год")}
        {navBtn("‹", prevMonth, "Предыдущий месяц")}

        <div style={{ padding: "6px 20px", border: `1.5px solid ${C.sage}`, borderRadius: 8, background: C.sage10, minWidth: 160, textAlign: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.textDk }}>
            {MONTH_NOM_FULL[selMonth]} {selYear}
          </span>
          {isRealData && (
            <span style={{ display: "block", fontSize: 10, color: C.sage, marginTop: 1 }}>реальные данные</span>
          )}
          {!isRealData && (
            <span style={{ display: "block", fontSize: 10, color: C.textLt, marginTop: 1 }}>прогноз</span>
          )}
        </div>

        {navBtn("›", nextMonth, "Следующий месяц")}
        {navBtn("»", nextYear,  "Следующий год")}

        {!isToday && (
          <button onClick={goToday}
            style={{ padding: "5px 12px", border: `1px solid ${C.sage}`, borderRadius: 6, background: C.sage10, color: C.sage, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Текущий
          </button>
        )}

        <div style={{ flex: 1 }} />
        <ExcelBtn onClick={() => {
          const periodLabel = `${MONTH_NOM_FULL[selMonth]}_${selYear}`;
          exportCsv(
            `План_и_факт_${periodLabel}.csv`,
            ["Статья", "Бюджет", "Факт", "Отклонение"],
            rows.map(r => {
              const diff = r.fact - r.budget;
              return [r.article, fmtShort(r.budget), fmtShort(r.fact), (diff >= 0 ? "+" : "−") + fmtShort(Math.abs(diff))];
            }),
          );
          onExport(); // triggers toast from parent
        }} />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.hdr }}>
              {["Статья расходов", "Бюджет", "Факт", "Отклонение", "%"].map(col => (
                <th key={col} style={{ padding: "10px 16px", textAlign: col === "Статья расходов" ? "left" : "right", fontWeight: 600, color: C.textDk, fontSize: 12 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const diff = row.fact - row.budget;
              const pct  = row.budget > 0 ? Math.round((row.fact / row.budget) * 100) : 0;
              const over = diff > 0;
              return (
                <tr key={row.article} style={{ background: i % 2 === 0 ? C.surface : C.ivory50, borderBottom: `1px solid rgba(192,192,160,0.35)` }}>
                  <td style={{ padding: "11px 16px", color: C.textDk, fontWeight: 500 }}>{row.article}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.textDk }}>{fmtShort(row.budget)}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.textDk, fontWeight: 500 }}>{fmtShort(row.fact)}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: over ? C.danger : C.sage, fontWeight: 500 }}>
                    {over ? "+" : "−"}{fmtShort(Math.abs(diff))}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: over ? C.danger : C.sage, fontWeight: 600 }}>
                    {pct}%
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: C.hdr }}>
              <td style={{ padding: "12px 16px", fontWeight: 700, color: C.textDk }}>Итого</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: C.textDk }}>{fmtShort(totalBudget)}</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: C.textDk }}>{fmtShort(totalFact)}</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: totalDiff > 0 ? C.danger : C.sage }}>
                {totalDiff > 0 ? "+" : "−"}{fmtShort(Math.abs(totalDiff))}
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: totalDiff > 0 ? C.danger : C.sage }}>{totalPct}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Выгрузки ─────────────────────────────────── */
function ExportsTab() {
  const { showToast } = useToast();
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
  const monthEnd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()}`;

  const handleExport = async (type: string) => {
    try {
      if (type === "balances") {
        const data = await api.reports.getBalances({ date_from: monthStart, date_to: monthEnd }) as any[];
        exportCsv(
          "Остатки_по_счетам.csv",
          ["Счёт", "Остаток на начало", "Приход", "Расход", "Остаток на конец"],
          data.map(r => [r.account, r.opening, r.income, r.expense, r.closing]),
        );
      } else if (type === "cashgaps") {
        const data = await api.reports.getCashGaps({ date_from: monthStart, date_to: monthEnd }) as any[];
        exportCsv(
          "Кассовые_разрывы.csv",
          ["Дата", "Счёт", "Дефицит", "Крупнейший платёж", "Сумма"],
          data.map(r => [r.date, r.account, r.deficit, r.top_payer, r.top_amount]),
        );
      } else if (type === "planfact") {
        const data = await api.reports.getPlanFact({ date_from: monthStart, date_to: monthEnd }) as any[];
        exportCsv(
          "План_и_факт.csv",
          ["Статья", "Бюджет", "Факт", "Отклонение"],
          data.map(r => [r.item, r.budget, r.fact, r.fact - r.budget]),
        );
      }
      showToast("Файл скачан", "success");
    } catch {
      showToast("Ошибка при выгрузке", "error");
    }
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
      {EXPORT_TYPES.map((f) => (
        <div
          key={f.id}
          style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.sage10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
            {f.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{f.name}</div>
            <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>
              Текущий месяц · CSV
            </div>
          </div>
          <button
            onClick={() => handleExport(f.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}
          >
            <Download size={13} />
            Скачать CSV
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── GoToCalendar button with visible hover ────────── */
function GoToCalBtn({ onClick }: { onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "7px 12px",
        borderRadius: 6,
        background: hov ? C.sage10 : "transparent",
        border: `1.5px solid ${hov ? C.sage : C.warm}`,
        color: C.sage,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
        transition: "background 0.15s, border-color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      Перейти в календарь
      <ArrowUpRight size={13} />
    </button>
  );
}

/* ── Shared: Excel button ──────────────────────────── */
function ExcelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}
    >
      <BarChart2 size={14} />
      Выгрузить в Excel
    </button>
  );
}
