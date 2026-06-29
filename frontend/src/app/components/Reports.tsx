import { useState, useRef } from "react";
import { BarChart2, AlertTriangle, ArrowUpRight, Calendar, ChevronDown, Download } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv } from "../utils";

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
const CASH_GAPS: CashGap[] = [
  { date: "28 мая 2026",  account: "Расчётный счёт №2",             deficit: -95000,  topPayer: "ООО РентаГрупп",   topAmount: 150000 },
  { date: "24 июня 2026", account: "Расчётный счёт №1, №2, Касса", deficit: -270000, topPayer: "ООО ТехСервис",    topAmount: 220000 },
  { date: "27 июня 2026", account: "Расчётный счёт №1, №2",        deficit: -240000, topPayer: "ИП Смирнов А.В.",  topAmount: 180000 },
  { date: "29 июня 2026", account: "Расчётный счёт №2, Касса",     deficit: -85000,  topPayer: "АО ТехСервис",     topAmount: 95000  },
];

interface BalanceRow {
  name: string; opening: number; income: number; expense: number; closing: number; isTotal?: boolean;
}
const BALANCE_ROWS: BalanceRow[] = [
  { name: "Расчётный счёт №1", opening: 850000,  income: 555000, expense: 820000, closing: 585000  },
  { name: "Расчётный счёт №2", opening: 310000,  income: 280000, expense: 420000, closing: 170000  },
  { name: "Касса",             opening: 85000,   income: 66000,  expense: 76000,  closing: 75000   },
  { name: "Итого",             opening: 1245000, income: 901000, expense: 1316000,closing: 830000, isTotal: true },
];

const PLAN_FACT_DATA: Record<string, { article: string; budget: number; fact: number }[]> = {
  "Апрель 2026": [
    { article: "Аренда офиса",        budget: 120000, fact: 120000 },
    { article: "Заработная плата",    budget: 560000, fact: 548000 },
    { article: "Расходные материалы", budget: 30000,  fact: 28400  },
    { article: "Услуги подрядчиков",  budget: 120000, fact: 95000  },
    { article: "Налоги и сборы",      budget: 280000, fact: 280000 },
  ],
  "Май 2026": [
    { article: "Аренда офиса",        budget: 120000, fact: 120000 },
    { article: "Заработная плата",    budget: 560000, fact: 572000 },
    { article: "Расходные материалы", budget: 30000,  fact: 41500  },
    { article: "Услуги подрядчиков",  budget: 150000, fact: 130000 },
    { article: "Налоги и сборы",      budget: 310000, fact: 295000 },
  ],
  "Июнь 2026": [
    { article: "Аренда офиса",        budget: 120000, fact: 120000 },
    { article: "Заработная плата",    budget: 580000, fact: 560000 },
    { article: "Расходные материалы", budget: 30000,  fact: 12500  },
    { article: "Услуги подрядчиков",  budget: 150000, fact: 180000 },
    { article: "Налоги и сборы",      budget: 350000, fact: 340000 },
  ],
};

const EXPORT_FILES = [
  { name: "Платёжный календарь",       period: "Июнь 2026",  file: "Kalendar_2026-06.xlsx"  },
  { name: "Реестр платежей",           period: "18.06.2026", file: "Reestr_18.06.2026.xlsx" },
  { name: "Кассовые разрывы",          period: "Q2 2026",    file: "Cashgaps_Q2_2026.xlsx"  },
  { name: "Остатки по счетам",         period: "Июнь 2026",  file: "Ostatok_2026-06.xlsx"   },
  { name: "Движение денежных средств", period: "H1 2026",    file: "DDS_H1_2026.xlsx"       },
];

/* ── Helpers ───────────────────────────────────────── */
const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function parseGapDate(s: string): Date {
  const p = s.split(" ");
  return new Date(+p[2], MONTHS_RU.indexOf(p[1]), +p[0]);
}
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
  const abs = Math.floor(Math.abs(n)).toString();
  const parts: string[] = [];
  for (let i = abs.length; i > 0; i -= 3) parts.unshift(abs.slice(Math.max(0, i - 3), i));
  return (n < 0 ? "−" : "") + parts.join(" ") + ",00 ₽";
}
function fmtShort(n: number): string {
  const abs = Math.floor(Math.abs(n)).toString();
  const parts: string[] = [];
  for (let i = abs.length; i > 0; i -= 3) parts.unshift(abs.slice(Math.max(0, i - 3), i));
  return parts.join(" ") + " ₽";
}

/* ── Main component ────────────────────────────────── */
export function Reports({ onGoToCalendar }: ReportsProps) {
  const [tab, setTab] = useState<TabId>("cashgaps");
  const { showToast } = useToast();

  const handleExport = () => {
    if (tab === "cashgaps") {
      exportCsv(
        "Кассовые_разрывы.csv",
        ["Дата", "Счёт", "Дефицит", "Крупнейший платёж", "Сумма платежа"],
        CASH_GAPS.map(g => [g.date, g.account, g.deficit + " ₽", g.topPayer, g.topAmount + " ₽"]),
      );
      showToast("Кассовые_разрывы.csv скачан", "success");
    } else if (tab === "balances") {
      exportCsv(
        "Остатки_по_счетам.csv",
        ["Счёт", "Остаток на начало", "Приход", "Расход", "Остаток на конец"],
        BALANCE_ROWS.map(r => [r.name, r.opening + " ₽", r.income + " ₽", r.expense + " ₽", r.closing + " ₽"]),
      );
      showToast("Остатки_по_счетам.csv скачан", "success");
    } else if (tab === "planfact") {
      // Export all periods combined
      const allRows: (string | number)[][] = [];
      Object.entries(PLAN_FACT_DATA).forEach(([period, items]) => {
        items.forEach(item => {
          const diff = item.fact - item.budget;
          allRows.push([period, item.article, item.budget + " ₽", item.fact + " ₽", (diff >= 0 ? "+" : "") + diff + " ₽"]);
        });
      });
      exportCsv(
        "План_и_факт.csv",
        ["Период", "Статья", "Бюджет", "Факт", "Отклонение"],
        allRows,
      );
      showToast("План_и_факт.csv скачан", "success");
    } else {
      showToast("Выберите вкладку с данными для выгрузки", "warning");
    }
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
        {tab === "balances" && <BalancesTab onExport={handleExport} />}
        {tab === "planfact" && <PlanFactTab onExport={handleExport} />}
        {tab === "exports"  && (
          <ExportsTab
            onDownload={(name, filename) => {
              if (name === "Реестр платежей") {
                exportCsv(filename, ["№", "Контрагент", "Статья", "Дефицит", "Крупнейший платёж"], CASH_GAPS.map(g => [g.date, g.account, "", g.deficit, g.topPayer]));
              } else if (name === "Кассовые разрывы") {
                exportCsv(filename, ["Дата", "Счёт", "Дефицит", "Крупнейший платёж", "Сумма"], CASH_GAPS.map(g => [g.date, g.account, g.deficit, g.topPayer, g.topAmount]));
              } else if (name === "Остатки по счетам") {
                exportCsv(filename, ["Счёт", "Начало", "Приход", "Расход", "Конец"], BALANCE_ROWS.map(r => [r.name, r.opening, r.income, r.expense, r.closing]));
              } else {
                exportCsv(filename, ["Отчёт", "Период"], [[name, "Июнь 2026"]]);
              }
              showToast(`${filename} скачан`, "success");
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Tab: Кассовые разрывы ─────────────────────────── */
function CashGapsTab({
  onGoToCalendar,
  onExport,
}: { onGoToCalendar?: () => void; onExport: () => void }) {
  const [period,   setPeriod]   = useState("week");
  const [dateFrom, setDateFrom] = useState("23.06.2026");
  const [dateTo,   setDateTo]   = useState("29.06.2026");

  /* ── Filter logic ── */
  const filteredGaps = CASH_GAPS.filter(gap => {
    const d = parseGapDate(gap.date);
    if (period === "week")    return d >= new Date(2026,5,23) && d <= new Date(2026,5,29);
    if (period === "month")   return d.getMonth()===5 && d.getFullYear()===2026;
    if (period === "quarter") return d >= new Date(2026,3,1) && d <= new Date(2026,5,30);
    if (period === "custom") {
      const from = parseRuDate(dateFrom);
      const to   = parseRuDate(dateTo);
      if (!from || !to) return true;
      return d >= from && d <= to;
    }
    return true;
  });

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
            {fmtFull(gap.deficit)}
          </div>
        </div>

        {/* Top payment */}
        <div style={{ padding: "8px 12px", background: C.danger08, borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={13} color={C.danger} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.textLt }}>Крупнейший платёж дня: </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textDk }}>{gap.topPayer}</span>
          <span style={{ fontSize: 12, color: C.textLt }}> — </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.danger, fontVariantNumeric: "tabular-nums" }}>
            {fmtShort(gap.topAmount)}
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
function BalancesTab({ onExport }: { onExport: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <ExcelBtn onClick={onExport} />
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
            {BALANCE_ROWS.map((row, i) => (
              <BalanceRow key={row.name} row={row} i={i} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: C.textLt }}>
        Период: 23 июня 2026 — 29 июня 2026 · Данные на 26 июня 2026, 12:00
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
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: C.textDk, fontWeight: row.isTotal ? 700 : 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {fmtShort(row.opening)}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: C.sage, fontWeight: row.isTotal ? 700 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        ↑ {fmtShort(row.income)}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: C.danger, fontWeight: row.isTotal ? 700 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        ↓ {fmtShort(row.expense)}
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right", color: row.isTotal ? C.textDk : closingColor, fontWeight: row.isTotal ? 700 : 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {fmtShort(row.closing)}
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
  const [period, setPeriod] = useState("Июнь 2026");

  const rows        = PLAN_FACT_DATA[period] ?? PLAN_FACT_DATA["Июнь 2026"];
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalFact   = rows.reduce((s, r) => s + r.fact,   0);
  const totalDiff   = totalFact - totalBudget;
  const totalPct    = Math.round((totalFact / totalBudget) * 100);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: "7px 28px 7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", appearance: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {["Апрель 2026", "Май 2026", "Июнь 2026"].map(p => <option key={p}>{p}</option>)}
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
            <ChevronDown size={13} />
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <ExcelBtn onClick={onExport} />
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
              const pct  = Math.round((row.fact / row.budget) * 100);
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
function ExportsTab({ onDownload }: { onDownload: (name: string, filename: string) => void }) {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
      {EXPORT_FILES.map((f, i) => (
        <div
          key={i}
          style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.sage10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BarChart2 size={18} color={C.sage} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{f.name}</div>
            <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>
              {f.period} · {f.file.replace(".xlsx", ".csv")}
            </div>
          </div>
          <button
            onClick={() => onDownload(f.name, f.file.replace(".xlsx", ".csv"))}
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
