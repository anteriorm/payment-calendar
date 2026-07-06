import { useState, useEffect, useRef, type ReactElement } from "react";
import { BarChart2, AlertTriangle, ArrowUpRight, Calendar, ChevronDown, Download } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv, formatAmount, getAccountCurrency } from "../utils";
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
const CASH_GAPS: CashGap[] = [
  { date: "28 мая 2026",  account: "Расчётный счёт №2",             deficit: -95000,  topPayer: "ООО РентаГрупп",   topAmount: 150000 },
  { date: "24 июня 2026", account: "Расчётный счёт №1, №2, Касса", deficit: -270000, topPayer: "ООО ТехСервис",    topAmount: 220000 },
  { date: "27 июня 2026", account: "Расчётный счёт №1, №2",        deficit: -240000, topPayer: "ИП Смирнов А.В.",  topAmount: 180000 },
  { date: "29 июня 2026", account: "Расчётный счёт №2, Касса",     deficit: -85000,  topPayer: "АО ТехСервис",     topAmount: 95000  },
];

interface BalanceRow {
  name: string; opening: number; income: number; expense: number; closing: number; isTotal?: boolean;
}
// Mock balance snapshots for different periods
const BALANCE_SNAPSHOTS: Record<string, BalanceRow[]> = {
  "week": [
    { name: "Расчётный счёт №1", opening: 850000,  income: 555000, expense: 820000,  closing: 585000  },
    { name: "Расчётный счёт №2", opening: 310000,  income: 280000, expense: 420000,  closing: 170000  },
    { name: "Касса",             opening: 85000,   income: 66000,  expense: 76000,   closing: 75000   },
    { name: "Итого",             opening: 1245000, income: 901000, expense: 1316000, closing: 830000, isTotal: true },
  ],
  "month": [
    { name: "Расчётный счёт №1", opening: 680000,  income: 2150000, expense: 1980000, closing: 850000  },
    { name: "Расчётный счёт №2", opening: 240000,  income: 870000,  expense: 800000,  closing: 310000  },
    { name: "Касса",             opening: 55000,   income: 210000,  expense: 180000,  closing: 85000   },
    { name: "Итого",             opening: 975000,  income: 3230000, expense: 2960000, closing: 1245000, isTotal: true },
  ],
  "quarter": [
    { name: "Расчётный счёт №1", opening: 420000,  income: 6500000, expense: 6070000, closing: 850000  },
    { name: "Расчётный счёт №2", opening: 180000,  income: 2400000, expense: 2340000, closing: 240000  },
    { name: "Касса",             opening: 30000,   income: 620000,  expense: 595000,  closing: 55000   },
    { name: "Итого",             opening: 630000,  income: 9520000, expense: 9005000, closing: 1145000, isTotal: true },
  ],
};
const BALANCE_ROWS = BALANCE_SNAPSHOTS["week"];

/** Returns balance snapshot for a given period key, or interpolates for custom date ranges. */
function getBalanceRows(period: string, dateFrom: string, dateTo: string): BalanceRow[] {
  if (period !== "custom") return BALANCE_SNAPSHOTS[period] ?? BALANCE_ROWS;
  const from = parseRuDate(dateFrom);
  const to   = parseRuDate(dateTo);
  if (!from || !to || to < from) return BALANCE_ROWS;
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  // Scale week data linearly by number of days for a simple demo interpolation
  const scale = days / 7;
  return BALANCE_SNAPSHOTS["week"].map(r => ({
    ...r,
    income:  Math.round(r.income  * scale / 1000) * 1000,
    expense: Math.round(r.expense * scale / 1000) * 1000,
    closing: r.opening + Math.round((r.income - r.expense) * scale / 1000) * 1000,
  }));
}

const PLAN_FACT_ARTICLES = [
  "Аренда офиса",
  "Заработная плата",
  "Расходные материалы",
  "Услуги подрядчиков",
  "Налоги и сборы",
];

// Base budgets per article (in rubles)
const ARTICLE_BUDGETS: Record<string, number> = {
  "Аренда офиса":        120000,
  "Заработная плата":    560000,
  "Расходные материалы":  30000,
  "Услуги подрядчиков":  150000,
  "Налоги и сборы":      310000,
};

// Real data for specific months — used as-is when available
const PLAN_FACT_DATA: Record<string, { article: string; budget: number; fact: number }[]> = {
  "Январь 2026": [
    { article: "Аренда офиса",        budget: 120000, fact: 120000 },
    { article: "Заработная плата",    budget: 540000, fact: 536000 },
    { article: "Расходные материалы", budget: 25000,  fact: 22000  },
    { article: "Услуги подрядчиков",  budget: 100000, fact: 85000  },
    { article: "Налоги и сборы",      budget: 290000, fact: 290000 },
  ],
  "Февраль 2026": [
    { article: "Аренда офиса",        budget: 120000, fact: 120000 },
    { article: "Заработная плата",    budget: 540000, fact: 548000 },
    { article: "Расходные материалы", budget: 25000,  fact: 31000  },
    { article: "Услуги подрядчиков",  budget: 100000, fact: 92000  },
    { article: "Налоги и сборы",      budget: 290000, fact: 290000 },
  ],
  "Март 2026": [
    { article: "Аренда офиса",        budget: 120000, fact: 120000 },
    { article: "Заработная плата",    budget: 550000, fact: 552000 },
    { article: "Расходные материалы", budget: 28000,  fact: 35400  },
    { article: "Услуги подрядчиков",  budget: 110000, fact: 98000  },
    { article: "Налоги и сборы",      budget: 300000, fact: 300000 },
  ],
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

/**
 * Deterministic pseudo-random generator for plan/fact data.
 * Produces consistent "realistic" numbers for any month not in PLAN_FACT_DATA.
 * Seed = month * 100 + year so each month/year has unique values.
 */
function genPlanFactData(month: number, year: number): { article: string; budget: number; fact: number }[] {
  const seed = (year * 12 + month) * 31;
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  return PLAN_FACT_ARTICLES.map(article => {
    const base   = ARTICLE_BUDGETS[article];
    // Budget varies ±10% from base
    const budget = Math.round(base * (0.90 + rnd() * 0.20) / 1000) * 1000;
    // Fact deviates ±25% from budget
    const fact   = Math.round(budget * (0.75 + rnd() * 0.50) / 100) * 100;
    return { article, budget, fact };
  });
}

const MONTH_NOM_FULL = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

function planFactKey(month: number, year: number): string {
  return `${MONTH_NOM_FULL[month]} ${year}`;
}

function getPlanFactRows(month: number, year: number): { article: string; budget: number; fact: number }[] {
  const key = planFactKey(month, year);
  return PLAN_FACT_DATA[key] ?? genPlanFactData(month, year);
}

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

// If account is a single-account string, resolve its currency; multi-account strings default to RUB
function resolveAccountCurrency(account: string): string {
  if (!account || account.includes(",")) return "RUB"; // aggregate / multi-account
  return getAccountCurrency(account);
}
function fmtFull(n: number, account = ""): string {
  const cur = resolveAccountCurrency(account);
  const rub = n / 100;
  return (rub < 0 ? "−" : "") + formatAmount(Math.abs(rub), cur);
}
function fmtShort(n: number, account = ""): string {
  return formatAmount(n / 100, resolveAccountCurrency(account));
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
        CASH_GAPS.map(g => [g.date, g.account, fmtShort(g.deficit, g.account), g.topPayer, fmtShort(g.topAmount, g.account)]),
      );
      showToast("Кассовые_разрывы.csv скачан", "success");
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
        {tab === "balances" && <BalancesTab />}
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
        date: g.date ?? '', account: g.account ?? '', deficit: g.deficit ?? 0,
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
      .then(data => setRows(data as BalanceRow[]))
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

  const PERIOD_LABELS: Record<string, string> = {
    week:    "23 июня 2026 — 29 июня 2026",
    month:   "01 июня 2026 — 30 июня 2026",
    quarter: "01 апреля 2026 — 30 июня 2026",
    custom:  `${dateFrom} — ${dateTo}`,
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
        Период: {PERIOD_LABELS[period]} · Данные актуальны на 26.06.2026
        {period === "custom" && parseRuDate(dateFrom) && parseRuDate(dateTo) && (
          <span style={{ color: C.olive, marginLeft: 8 }}>Суммы рассчитаны пропорционально длине периода (прогноз)</span>
        )}
        {period === "custom" && !parseRuDate(dateFrom) && (
          <span style={{ color: C.danger, marginLeft: 8 }}>Введите корректную дату начала (дд.мм.гггг)</span>
        )}
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
