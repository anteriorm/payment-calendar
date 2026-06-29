import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalIcon, GripVertical } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { C } from "../tokens";
import { ruFmt, fmtAmt, fmtBalance } from "../utils";

type Period   = "week" | "month" | "quarter" | "custom";
type DayState = "positive" | "cashgap" | "zero";
type AccKey   = "acc1" | "acc2" | "cash";

export interface SelectedCell {
  dayDate:        number;
  accKey:         AccKey;
  isCashGap?:     boolean;
  deficitAmount?: number;
}

interface DayEntry { income: number; expense: number; balance: number; }

interface CalendarDay {
  date:      number;
  month:     number;
  dayName:   string;
  state:     DayState;
  isToday:   boolean;
  isWeekend: boolean;
  acc1:      DayEntry;
  acc2:      DayEntry;
  cash:      DayEntry;
  total:     DayEntry;
}

/* ── Static hand-crafted week: June 23–29 2026 ─────── */
const STATIC_DAYS: CalendarDay[] = [
  { date: 23, month: 5, dayName: "Пн", state: "positive", isToday: false, isWeekend: false,
    acc1:  { income: 120000, expense:  85000, balance:   35000 },
    acc2:  { income:  60000, expense:  40000, balance:   20000 },
    cash:  { income:  15000, expense:  10000, balance:    5000 },
    total: { income: 195000, expense: 135000, balance:   60000 } },
  { date: 24, month: 5, dayName: "Вт", state: "cashgap", isToday: false, isWeekend: false,
    acc1:  { income:  30000, expense: 220000, balance: -190000 },
    acc2:  { income:  15000, expense:  80000, balance:  -65000 },
    cash:  { income:   5000, expense:  20000, balance:  -15000 },
    total: { income:  50000, expense: 320000, balance: -270000 } },
  { date: 25, month: 5, dayName: "Ср", state: "positive", isToday: false, isWeekend: false,
    acc1:  { income:  95000, expense:  60000, balance:   35000 },
    acc2:  { income:  45000, expense:  30000, balance:   15000 },
    cash:  { income:  10000, expense:   8000, balance:    2000 },
    total: { income: 150000, expense:  98000, balance:   52000 } },
  { date: 26, month: 5, dayName: "Чт", state: "positive", isToday: true,  isWeekend: false,
    acc1:  { income: 150000, expense:  80000, balance:   70000 },
    acc2:  { income:  80000, expense:  50000, balance:   30000 },
    cash:  { income:  20000, expense:  12000, balance:    8000 },
    total: { income: 250000, expense: 142000, balance:  108000 } },
  { date: 27, month: 5, dayName: "Пт", state: "cashgap", isToday: false, isWeekend: false,
    acc1:  { income:  20000, expense: 180000, balance: -160000 },
    acc2:  { income:  10000, expense:  75000, balance:  -65000 },
    cash:  { income:   3000, expense:  18000, balance:  -15000 },
    total: { income:  33000, expense: 273000, balance: -240000 } },
  { date: 28, month: 5, dayName: "Сб", state: "zero",    isToday: false, isWeekend: true,
    acc1:  { income: 100000, expense: 100000, balance:       0 },
    acc2:  { income:  50000, expense:  50000, balance:       0 },
    cash:  { income:   8000, expense:   8000, balance:       0 },
    total: { income: 158000, expense: 158000, balance:       0 } },
  { date: 29, month: 5, dayName: "Вс", state: "cashgap", isToday: false, isWeekend: true,
    acc1:  { income:  40000, expense:  95000, balance:  -55000 },
    acc2:  { income:  20000, expense:  45000, balance:  -25000 },
    cash:  { income:   5000, expense:  10000, balance:   -5000 },
    total: { income:  65000, expense: 150000, balance:  -85000 } },
];

/* ── Date helpers ───────────────────────────────────── */
const BASE       = new Date(2026, 5, 23);   // Monday 23 June 2026
const TODAY_DATE = new Date(2026, 5, 26);

const DAY_SHORT  = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const MONTH_GEN  = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MONTH_NOM  = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAY_NAMES_GRID = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function offsetToDate(offset: number): Date {
  const d = new Date(BASE);
  d.setDate(BASE.getDate() + offset);
  return d;
}
function dateToOffset(d: Date): number {
  return Math.round((d.getTime() - BASE.getTime()) / 86400000);
}
function formatDateRu(d: Date): string {
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1]));
  return isNaN(d.getTime()) ? null : d;
}
function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

/* ── PRNG / day generator ───────────────────────────── */
function prng(seed: number): number {
  let s = ((seed+1)*1664525+1013904223)>>>0;
  s = (s*1664525+1013904223)>>>0;
  return s/0xFFFFFFFF;
}
function genRound(seed: number, min: number, max: number): number {
  return Math.floor(min + prng(seed)*(max-min)+0.5)*5000;
}
function genEntry(seed: number, small=false): DayEntry {
  const k = small ? 0.12 : 1;
  const income  = genRound(seed*3+1, 10000*k, 180000*k);
  const expense = genRound(seed*3+2, 15000*k, 220000*k);
  return { income, expense, balance: income-expense };
}
function genDay(d: Date): CalendarDay {
  const seed = d.getDate()*100+(d.getMonth()+1)*10+Math.floor(d.getFullYear()/100);
  const isWeekend = d.getDay()===0||d.getDay()===6;
  const isToday   = d.toDateString()===TODAY_DATE.toDateString();
  const acc1  = genEntry(seed+11);
  const acc2  = genEntry(seed+22);
  const cash  = genEntry(seed+33,true);
  const total: DayEntry = { income: acc1.income+acc2.income+cash.income, expense: acc1.expense+acc2.expense+cash.expense, balance: acc1.balance+acc2.balance+cash.balance };
  const state: DayState = total.balance<0?"cashgap":total.balance===0?"zero":"positive";
  return { date: d.getDate(), month: d.getMonth(), dayName: DAY_SHORT[d.getDay()], state, isToday, isWeekend, acc1, acc2, cash, total };
}

/** Returns static data for June 23-29, generated otherwise. */
function getDayData(d: Date): CalendarDay {
  if (d.getFullYear()===2026 && d.getMonth()===5) {
    const s = STATIC_DAYS.find(x => x.date===d.getDate());
    if (s) return s;
  }
  return genDay(d);
}

function getMatrixDays(startOffset: number, count: number): CalendarDay[] {
  return Array.from({ length: count }, (_, i) => getDayData(offsetToDate(startOffset+i)));
}

/** Returns cells for a month grid: null = empty padding cell. */
function getMonthCells(month: number, year: number): (CalendarDay | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let pad = first.getDay()-1;
  if (pad<0) pad=6;  // Sunday → 6
  const cells: (CalendarDay | null)[] = [];
  for (let i=0;i<pad;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(getDayData(new Date(year,month,d)));
  while (cells.length%7!==0) cells.push(null);
  return cells;
}

/* ── Constants ──────────────────────────────────────── */
const ACCOUNTS: { key: AccKey; name: string }[] = [
  { key: "acc1", name: "Расчётный счёт №1" },
  { key: "acc2", name: "Расчётный счёт №2" },
  { key: "cash", name: "Касса"             },
];
const PAYER_NAMES = ["ООО Поставщик Альфа","ИП Смирнов А.В.","АО ТехСервис","ООО РентаГрупп","ПАО Энергоресурс"];
const PERIOD_LABELS: Record<Period, string> = { week: "Неделя", month: "Месяц", quarter: "Квартал", custom: "Период" };

const HDR_H=70, ACCT_W=180, DAY_MIN=142, SCROLL_PAD=24;
const DENSE_ROW_H=40, DENSE_TOTAL_H=48, FULL_ROW_H=72, FULL_TOTAL_H=82;
const GRID_CELL_H=104;

// Фон: только кассовый разрыв закрашивается красным, остальные дни — белые
function getColBg(s: DayState) { return s === "cashgap" ? C.danger12 : C.surface; }
// Рамки: единый нейтральный цвет для всех колонок (без красных/зелёных)
function getColBorder(_day: CalendarDay) { return `1px solid ${C.warm}`; }

function getTooltipItems(day: CalendarDay, accKey: AccKey) {
  const entry = day[accKey];
  const seed  = day.date*3+(accKey==="acc1"?0:accKey==="acc2"?1:2);
  const items: { name: string; amount: number; type: "in"|"out" }[] = [];
  if (entry.income>0)  items.push({ name: PAYER_NAMES[seed%5], amount: entry.income, type: "in" });
  if (entry.expense>0) {
    if (entry.expense>80000) {
      items.push({ name: PAYER_NAMES[(seed+1)%5], amount: Math.round(entry.expense*0.62), type: "out" });
      items.push({ name: PAYER_NAMES[(seed+3)%5], amount: Math.round(entry.expense*0.38), type: "out" });
    } else {
      items.push({ name: PAYER_NAMES[(seed+2)%5], amount: entry.expense, type: "out" });
    }
  }
  return items;
}

/* ── Component props ────────────────────────────────── */
interface TooltipState { dayDate: number; accKey: AccKey; x: number; y: number; }
interface PaidConfirmation { dateStr: string; amount: number; }

interface PaymentCalendarProps {
  onCreateRequest?:    () => void;
  onSelectRequest?:    (cell: SelectedCell) => void;
  onGoToRegistry?:     () => void;
  onRescheduleReady?:  (fn: (from: string, to: string, amount: number, accKey?: AccKey) => void) => void;
  paidConfirmations?:  PaidConfirmation[];
  canReschedule?:      boolean;  // разрешение роли на перенос даты
}

/* ═══════════════════════════════════════════════════════
   PaymentCalendar
═══════════════════════════════════════════════════════ */
export function PaymentCalendar({ onCreateRequest, onSelectRequest, onGoToRegistry, onRescheduleReady, paidConfirmations, canReschedule = false }: PaymentCalendarProps) {
  /* ── Mutable copy of static days (enables reschedule) ── */
  const [mutableDays, setMutableDays] = useState<CalendarDay[]>(() =>
    STATIC_DAYS.map(d => ({ ...d, acc1: {...d.acc1}, acc2: {...d.acc2}, cash: {...d.cash}, total: {...d.total} }))
  );

  /* ── Local day lookup — MUST be declared before matrixDays/gridCells ── */
  const getDayDataLocal = useCallback((d: Date): CalendarDay => {
    if (d.getFullYear() === 2026 && d.getMonth() === 5) {
      const found = mutableDays.find(x => x.date === d.getDate());
      if (found) return found;
    }
    return genDay(d);
  }, [mutableDays]);

  /**
   * Reschedule: перенести расход с fromStr на toStr по конкретному счёту accKey.
   * accKey — "acc1" | "acc2" | "cash" — определяет КАКОЙ счёт меняется.
   * Итоговая строка (total) пересчитывается автоматически как сумма трёх счётов.
   */
  const reschedulePayment = useCallback((
    fromStr: string,
    toStr:   string,
    amount:  number,
    accKey:  AccKey = "acc1",   // по умолчанию acc1 для совместимости с drawer
  ) => {
    const from = parseDate(fromStr);
    const to   = parseDate(toStr);
    if (!from || !to) return;

    setMutableDays(prev => {
      const next = prev.map(d => ({
        ...d,
        acc1:  { ...d.acc1  },
        acc2:  { ...d.acc2  },
        cash:  { ...d.cash  },
        total: { ...d.total },
      }));

      const fromDay = from.getFullYear() === 2026 && from.getMonth() === 5
        ? next.find(x => x.date === from.getDate()) : null;
      const toDay = to.getFullYear() === 2026 && to.getMonth() === 5
        ? next.find(x => x.date === to.getDate()) : null;

      // Уменьшаем расход на ИСХОДНОМ дне для конкретного счёта
      if (fromDay) {
        const acc = fromDay[accKey];
        const moved = Math.min(amount, acc.expense);
        acc.expense -= moved;
        acc.balance  = acc.income - acc.expense;
        // Пересчитываем total как сумму всех счётов
        fromDay.total.expense = fromDay.acc1.expense + fromDay.acc2.expense + fromDay.cash.expense;
        fromDay.total.income  = fromDay.acc1.income  + fromDay.acc2.income  + fromDay.cash.income;
        fromDay.total.balance = fromDay.total.income  - fromDay.total.expense;
        fromDay.state = fromDay.total.balance < 0 ? "cashgap" : fromDay.total.balance === 0 ? "zero" : "positive";
      }

      // Увеличиваем расход на ЦЕЛЕВОМ дне для того же счёта
      if (toDay) {
        const acc = toDay[accKey];
        acc.expense += amount;
        acc.balance  = acc.income - acc.expense;
        toDay.total.expense = toDay.acc1.expense + toDay.acc2.expense + toDay.cash.expense;
        toDay.total.income  = toDay.acc1.income  + toDay.acc2.income  + toDay.cash.income;
        toDay.total.balance = toDay.total.income  - toDay.total.expense;
        toDay.state = toDay.total.balance < 0 ? "cashgap" : toDay.total.balance === 0 ? "zero" : "positive";
      }

      return next;
    });
  }, []);

  /* Register reschedule fn with parent once on mount */
  useEffect(() => {
    onRescheduleReady?.(reschedulePayment);
  }, [reschedulePayment, onRescheduleReady]);

  const [period,       setPeriod]       = useState<Period>("week");
  const [dayOffset,    setDayOffset]    = useState(0);
  const [pageIndex,    setPageIndex]    = useState(0);
  const [dense,        setDense]        = useState(false);
  const [tooltip,      setTooltip]      = useState<TooltipState | null>(null);
  const [customFrom,   setCustomFrom]   = useState("23.06.2026");
  const [customTo,     setCustomTo]     = useState("29.06.2026");
  const [statusFilter, setStatusFilter] = useState("");

  /* ── Derived display state ── */
  const anchor        = offsetToDate(dayOffset);
  const dispMonth     = anchor.getMonth();
  const dispYear      = anchor.getFullYear();

  const customFromDate = parseDate(customFrom);
  const customToDate   = parseDate(customTo);
  const customDays     = customFromDate && customToDate ? daysBetween(customFromDate, customToDate) : 7;
  const customStart    = customFromDate ? dateToOffset(customFromDate) : dayOffset;

  // true → month/quarter grid; false → account×day matrix
  const useGrid = period === "month" || period === "quarter";

  // custom period paging (page size = 14 days)
  const PAGE_SIZE  = 14;
  const totalPages = period === "custom" ? Math.max(1, Math.ceil(customDays / PAGE_SIZE)) : 1;

  // matrix params
  const matrixCount  = period === "custom"
    ? Math.max(1, Math.min(PAGE_SIZE, customDays - pageIndex * PAGE_SIZE))
    : 7;
  const matrixOffset = period === "custom" ? customStart + pageIndex * PAGE_SIZE : dayOffset;
  const matrixDays   = Array.from({ length: matrixCount }, (_, i) => getDayDataLocal(offsetToDate(matrixOffset + i)));

  // grid params (month mode) — use local lookup so reschedule reflects here too
  const gridCells = (() => {
    const first = new Date(dispYear, dispMonth, 1);
    const daysInMonth = new Date(dispYear, dispMonth + 1, 0).getDate();
    let pad = first.getDay() - 1; if (pad < 0) pad = 6;
    const cells: (CalendarDay | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(getDayDataLocal(new Date(dispYear, dispMonth, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  // quarter: always snap dispMonth to quarter start
  const qStartMonth = Math.floor(dispMonth / 3) * 3;  // 0, 3, 6, or 9

  const ROW_H   = dense ? DENSE_ROW_H   : FULL_ROW_H;
  const TOTAL_H = dense ? DENSE_TOTAL_H : FULL_TOTAL_H;

  /* ── Period label ── */
  const periodLabel = (() => {
    if (period === "month") return `${MONTH_NOM[dispMonth]} ${dispYear}`;
    if (period === "quarter") {
      const qNames = ["I кв.", "II кв.", "III кв.", "IV кв."];
      const q = Math.floor(dispMonth / 3);
      const sm = MONTH_NOM[q * 3].toLowerCase();
      const em = MONTH_NOM[q * 3 + 2].toLowerCase();
      return `${qNames[q]} ${dispYear} · ${sm} — ${em}`;
    }
    if (period === "custom") return "";
    // week
    const s = offsetToDate(dayOffset);
    const e = offsetToDate(dayOffset+6);
    if (s.getMonth()===e.getMonth()) return `${MONTH_NOM[s.getMonth()]} ${s.getFullYear()}`;
    return `${s.getDate()} ${MONTH_GEN[s.getMonth()]} — ${e.getDate()} ${MONTH_GEN[e.getMonth()]} ${e.getFullYear()}`;
  })();

  /* ── Navigation ── */
  const goBack = () => {
    if (period === "month") {
      const d = new Date(dispYear, dispMonth, 1);
      d.setMonth(d.getMonth() - 1);
      setDayOffset(dateToOffset(d));
    } else if (period === "quarter") {
      // snap to start of previous quarter
      const d = new Date(dispYear, qStartMonth - 3, 1);
      setDayOffset(dateToOffset(d));
    } else if (period === "custom") {
      // paginate within the fixed range — never shift the range itself
      setPageIndex(p => Math.max(0, p - 1));
    } else {
      setDayOffset(p => p - 7);
    }
  };
  const goFwd = () => {
    if (period === "month") {
      const d = new Date(dispYear, dispMonth + 1, 1);
      setDayOffset(dateToOffset(d));
    } else if (period === "quarter") {
      // snap to start of next quarter
      const d = new Date(dispYear, qStartMonth + 3, 1);
      setDayOffset(dateToOffset(d));
    } else if (period === "custom") {
      // paginate within the fixed range — never skip days
      setPageIndex(p => Math.min(totalPages - 1, p + 1));
    } else {
      setDayOffset(p => p + 7);
    }
  };
  const goToday = () => {
    setDayOffset(0);
    setPageIndex(0);
    if (period === "custom") { setCustomFrom("23.06.2026"); setCustomTo("29.06.2026"); }
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setPageIndex(0);
    if (p !== "custom") setDayOffset(0);
    if (p === "quarter") {
      // snap anchor to start of current quarter
      const now = offsetToDate(dayOffset);
      const d = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      setDayOffset(dateToOffset(d));
    }
    if (p === "custom") {
      const s = offsetToDate(dayOffset);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      setCustomFrom(formatDateRu(s));
      setCustomTo(formatDateRu(e));
    }
  };

  /* ── Tooltip handlers ── */
  const handleCellEnter = (e: React.MouseEvent, dayDate: number, accKey: AccKey) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ dayDate, accKey, x: rect.right+8, y: rect.top });
  };
  const handleCellClick = (day: CalendarDay, accKey: AccKey) => {
    onSelectRequest?.({ dayDate: day.date, accKey, isCashGap: day.state==="cashgap", deficitAmount: day.state==="cashgap"?day.total.balance:undefined });
  };

  /* ── Range hint label for custom mode ── */
  const rangeHint = (() => {
    if (period !== "custom" || !customFromDate || !customToDate) return null;
    if (totalPages <= 1) return `${customDays} дн.`;
    return `${customDays} дн. · стр. ${pageIndex + 1} из ${totalPages}`;
  })();

  /* ── Custom date change handlers (also reset page) ── */
  const handleCustomFromChange = (v: string) => { setCustomFrom(v); setPageIndex(0); };
  const handleCustomToChange   = (v: string) => { setCustomTo(v);   setPageIndex(0); };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", fontFamily:"Inter, sans-serif" }}>

      {/* ── Control panel ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.warm}`, padding: "10px 24px", display:"flex", alignItems:"center", gap:10, flexShrink:0, flexWrap:"wrap" }}>

        {/* Period tabs */}
        <div style={{ display:"flex", background: C.ivory, borderRadius:6, padding:2, gap:2 }}>
          {(["week","month","quarter","custom"] as Period[]).map(p => {
            const active = period===p;
            return (
              <button key={p} onClick={() => handlePeriodChange(p)}
                style={{ padding:"5px 13px", borderRadius:4, border:"none", background: active?C.sage:"transparent", color: active?C.surface:C.textLt, fontSize:13, fontWeight: active?600:400, cursor:"pointer", fontFamily:"Inter, sans-serif", transition:"background 0.15s" }}>
                {PERIOD_LABELS[p]}
              </button>
            );
          })}
        </div>

        {/* Density toggle */}
        <div style={{ display:"flex", background: C.ivory, borderRadius:6, padding:2, gap:2 }}>
          {[false,true].map(d => {
            const active = dense===d;
            return (
              <button key={String(d)} onClick={() => setDense(d)}
                style={{ padding:"5px 11px", borderRadius:4, border:"none", background: active?C.olive:"transparent", color: active?C.surface:C.textLt, fontSize:12, fontWeight: active?600:400, cursor:"pointer", fontFamily:"Inter, sans-serif" }}>
                {d?"Компактный":"Развёрнутый"}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {/* left arrow — disabled on first page in custom mode */}
          <button onClick={goBack} aria-label="Назад"
            disabled={period === "custom" && pageIndex === 0}
            style={{ background:"none", border:`1px solid ${C.warm}`, borderRadius:6, cursor: period==="custom" && pageIndex===0 ? "default" : "pointer", color: period==="custom" && pageIndex===0 ? C.warm : C.textLt, padding:"4px 6px", display:"flex", alignItems:"center", transition:"color 0.15s" }}>
            <ChevronLeft size={16} />
          </button>

          {period === "custom" ? (
            /* Custom date range inputs */
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:12, color:C.textLt }}>с</span>
              <DateInput value={customFrom} onChange={handleCustomFromChange} />
              <span style={{ fontSize:12, color:C.textLt }}>по</span>
              <DateInput value={customTo}   onChange={handleCustomToChange} />
              {rangeHint && (
                <span style={{ fontSize:11, color:C.textLt, padding:"3px 8px", background:C.ivory, borderRadius:4, whiteSpace:"nowrap" }}>
                  {rangeHint}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize:14, fontWeight:600, color:C.textDk, minWidth:160, textAlign:"center", padding:"0 4px" }}>
              {periodLabel}
            </span>
          )}

          {/* right arrow — disabled on last page in custom mode */}
          <button onClick={goFwd} aria-label="Вперёд"
            disabled={period === "custom" && pageIndex === totalPages - 1}
            style={{ background:"none", border:`1px solid ${C.warm}`, borderRadius:6, cursor: period==="custom" && pageIndex===totalPages-1 ? "default" : "pointer", color: period==="custom" && pageIndex===totalPages-1 ? C.warm : C.textLt, padding:"4px 6px", display:"flex", alignItems:"center", transition:"color 0.15s" }}>
            <ChevronRight size={16} />
          </button>

          {(period !== "custom" && dayOffset !== 0) && (
            <button onClick={goToday}
              style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.sage}`, background:C.sage10, color:C.sage, fontSize:12, cursor:"pointer", fontFamily:"Inter, sans-serif", marginLeft:2 }}>
              Сегодня
            </button>
          )}
        </div>

        {/* Status filter */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" }}>
          <span style={{ fontSize:12, color:C.textLt, whiteSpace:"nowrap" }}>Статус:</span>
          <div style={{ position:"relative" }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding:"5px 28px 5px 10px",
                border: statusFilter ? `1.5px solid ${C.sage}` : `1px solid ${C.warm}`,
                borderRadius:6,
                background: statusFilter ? C.sage10 : C.surface,
                color: statusFilter ? C.sage : C.textLt,
                fontSize:12,
                fontWeight: statusFilter ? 600 : 400,
                cursor:"pointer",
                fontFamily:"Inter, sans-serif",
                outline:"none",
                appearance:"none",
              }}
            >
              <option value="">Все</option>
              <option value="draft">Черновик</option>
              <option value="pending">На согласовании</option>
              <option value="approved">Согласована</option>
              <option value="inRegistry">В реестре</option>
              <option value="paid">Оплачена</option>
            </select>
            <div style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color: statusFilter ? C.sage : C.textLt, display:"flex" }}>
              <ChevronRight size={11} style={{ transform:"rotate(90deg)" }} />
            </div>
          </div>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter("")}
              title="Сбросить фильтр"
              style={{ background:"none", border:"none", cursor:"pointer", color:C.textLt, padding:"2px 4px", fontSize:14, lineHeight:1, borderRadius:4 }}
            >×</button>
          )}
        </div>

        {/* Action buttons — render only when role permits */}
        {(onCreateRequest || onGoToRegistry) && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {onCreateRequest && (
              <button onClick={onCreateRequest}
                style={{ padding:"7px 16px", borderRadius:6, background:C.sage, color:C.surface, border:"none", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"Inter, sans-serif" }}>
                Создать заявку
              </button>
            )}
            {onGoToRegistry && (
              <button onClick={onGoToRegistry}
                style={{ padding:"7px 14px", borderRadius:6, background:"transparent", color:C.olive, border:`1.5px solid ${C.olive}`, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"Inter, sans-serif" }}>
                Сформировать реестр
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Status filter banner ── */}
      {statusFilter && (() => {
        const LABELS: Record<string, string> = {
          draft: "Черновик", pending: "На согласовании", approved: "Согласована",
          inRegistry: "В реестре", paid: "Оплачена",
        };
        return (
          <div style={{ background: C.sage10, borderBottom: `1px solid ${C.sage}`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: C.sage, fontWeight: 600 }}>
              Фильтр: только платежи в статусе «{LABELS[statusFilter]}»
            </span>
            <span style={{ fontSize: 11, color: C.textLt }}>
              — суммы скорректированы для демонстрации
            </span>
            <button onClick={() => setStatusFilter("")}
              style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.sage}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, color: C.sage, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Сбросить
            </button>
          </div>
        );
      })()}

      {/* ── View ── */}
      {useGrid ? (
        /* ════ MONTH / QUARTER GRID VIEW ════ */
        <div style={{ flex:1, overflow:"auto", padding:SCROLL_PAD }}>
          {period === "quarter" ? (
            /* ── 3 month grids stacked ── */
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              {[0, 1, 2].map(offset => {
                const mMonth = qStartMonth + offset;          // always 0-11
                const cells  = getMonthCells(mMonth, dispYear);
                return (
                  <div key={mMonth} style={{ background:C.surface, border:`1px solid ${C.warm}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 3px rgba(44,44,30,0.10)" }}>
                    <div style={{ padding:"10px 16px", background:C.ivory, borderBottom:`1px solid ${C.warm}`, fontSize:14, fontWeight:600, color:C.textDk }}>
                      {MONTH_NOM[mMonth]} {dispYear}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:C.ivory, borderBottom:`1px solid ${C.warm}` }}>
                      {DAY_NAMES_GRID.map((d,i) => (
                        <div key={d} style={{ padding:"9px 8px", textAlign:"center", fontSize:12, fontWeight:600, color: i>=5?C.textLt:C.textDk }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
                      {cells.map((day, i) => (
                        <GridDayCell key={i} day={day} isWeekend={i%7>=5} dense={dense}
                          onClick={() => day && handleCellClick(day, "acc1")} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <Legend />
            </div>
          ) : (
            /* ── Single month grid ── */
            <div style={{ background:C.surface, border:`1px solid ${C.warm}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 3px rgba(44,44,30,0.10)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:C.ivory, borderBottom:`1px solid ${C.warm}` }}>
                {DAY_NAMES_GRID.map((d,i) => (
                  <div key={d} style={{ padding:"9px 8px", textAlign:"center", fontSize:12, fontWeight:600, color: i>=5?C.textLt:C.textDk }}>
                    {d}
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
                {gridCells.map((day, i) => (
                  <GridDayCell key={i} day={day} isWeekend={i%7>=5} dense={dense}
                    onClick={() => day && handleCellClick(day, "acc1")} />
                ))}
              </div>
            </div>
          )}

          {period === "month" && <Legend />}
        </div>
      ) : (
        /* ════ MATRIX VIEW (week / short period) ════ */
        <div style={{ flex:1, overflow:"auto", padding:`${SCROLL_PAD}px ${SCROLL_PAD}px 0` }}>
          <div style={{ display:"flex", minWidth:"max-content", border:`1px solid ${C.warm}`, borderRadius:8, boxShadow:"0 1px 3px rgba(44,44,30,0.10)" }}>

            {/* Sticky account names */}
            <div style={{ width:ACCT_W, flexShrink:0, position:"sticky", left:0, zIndex:5, background:C.ivory, overflow:"hidden", borderRadius:"7px 0 0 7px", borderRight:`1px solid ${C.warm}` }}>
              <div style={{ height:HDR_H, background:C.ivory, borderBottom:`1px solid ${C.warm}`, boxSizing:"border-box" as const }} />
              {ACCOUNTS.map(acc => (
                <div key={acc.key} style={{ height:ROW_H, background:C.ivory, borderBottom:`1px solid ${C.warm}`, display:"flex", alignItems:"center", padding:"0 14px", transition:"height 0.15s", boxSizing:"border-box" as const }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.textDk }}>{acc.name}</span>
                </div>
              ))}
              <div style={{ height:TOTAL_H, background:C.surface, borderTop:`2px solid ${C.warm}`, display:"flex", alignItems:"center", padding:"0 14px", transition:"height 0.15s", boxSizing:"border-box" as const }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.textDk }}>Итого по всем счетам</span>
              </div>
            </div>

            {/* Day columns */}
            {matrixDays.map(day => {
              const colBg     = getColBg(day.state);
              const colBorder = getColBorder(day);
              const hdrBg = C.ivory;  // шапка дней — такой же цвет как первый столбец
              return (
                <div key={`${day.month}-${day.date}`} style={{ flex:1, minWidth:DAY_MIN, border:colBorder, marginLeft:-1 }}>
                  {/* Header */}
                  <div style={{ height:HDR_H, background:hdrBg, boxSizing:"border-box" as const, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:"6px 4px", borderBottom:`1px solid ${C.warm}` }}>
                    <span style={{ fontSize:12, fontWeight:500, color: C.textLt }}>{day.dayName}</span>
                    {day.isToday ? (
                      <div style={{ width:28, height:28, borderRadius:"50%", background:C.sage, display:"flex", alignItems:"center", justifyContent:"center", color:C.surface, fontSize:14, fontWeight:700 }}>
                        {day.date}
                      </div>
                    ) : (
                      <span style={{ fontSize:16, fontWeight: 600, color: C.textDk }}>{day.date}</span>
                    )}
                    {day.state==="cashgap" && (
                      <div style={{ display:"flex", alignItems:"center", gap:2, marginTop:1 }}>
                        <AlertTriangle size={9} color={C.danger} />
                        <span style={{ fontSize:10, color:C.danger, fontWeight:600, whiteSpace:"nowrap" }}>
                          {"−"+ruFmt(Math.abs(day.total.balance))+" ₽"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Account rows — draggable only when canReschedule=true */}
                  {canReschedule ? (
                    <DroppableColumn day={day} onDropReschedule={(item, toDate, toMonth) => {
                      const year = offsetToDate(matrixOffset).getFullYear();
                      const fromStr = `${String(item.fromDate).padStart(2,"0")}.${String(item.fromMonth+1).padStart(2,"0")}.${year}`;
                      const toStr   = `${String(toDate).padStart(2,"0")}.${String(toMonth+1).padStart(2,"0")}.${year}`;
                      // Передаём item.accKey — перенос происходит именно на том счёте, который перетащили
                      reschedulePayment(fromStr, toStr, item.amount, item.accKey);
                    }}>
                      {ACCOUNTS.map(acc => (
                        <DraggableCellRow
                          key={`${day.date}-${acc.key}`}
                          entry={day[acc.key]} height={ROW_H} bg={colBg} dense={dense}
                          fromDate={day.date} fromMonth={day.month} accKey={acc.key}
                          canDrag={true}
                          onClick={() => handleCellClick(day, acc.key)}
                          onMouseEnter={e => handleCellEnter(e, day.date, acc.key)}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      ))}
                    </DroppableColumn>
                  ) : (
                    /* Без drag-and-drop для ролей без canReschedule */
                    <div>
                      {ACCOUNTS.map(acc => (
                        <CellRow
                          key={`${day.date}-${acc.key}`}
                          entry={day[acc.key]} height={ROW_H} bg={colBg} dense={dense}
                          onClick={() => handleCellClick(day, acc.key)}
                          onMouseEnter={e => handleCellEnter(e, day.date, acc.key)}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  {(() => {
                    const dayDateStr = `${String(day.date).padStart(2,"0")}.${String(day.month+1).padStart(2,"0")}.${offsetToDate(matrixOffset).getFullYear()}`;
                    const confirmedAmt = paidConfirmations
                      ? paidConfirmations.filter(p => p.dateStr === dayDateStr).reduce((s, p) => s + p.amount, 0)
                      : 0;
                    return (
                      <CellRow
                        entry={day.total}
                        height={TOTAL_H}
                        bg={day.state === "cashgap" ? C.danger12 : C.surface}
                        bgHover={day.state === "cashgap" ? "rgba(192,80,74,0.20)" : C.beige40}
                        dense={dense}
                        isTotalRow
                        confirmedAmt={confirmedAmt}
                      />
                    );
                  })()}
                </div>
              );
            })}
          </div>

          <div style={{ paddingBottom:24 }}>
            <Legend />
          </div>
        </div>
      )}

      {/* ── Tooltip ── */}
      {!useGrid && tooltip && (() => {
        const day  = matrixDays.find(d => d.date===tooltip.dayDate);
        if (!day) return null;
        const items = getTooltipItems(day, tooltip.accKey);
        const acc   = ACCOUNTS.find(a => a.key===tooltip.accKey)!;
        const tipW  = 260;
        const left  = tooltip.x+tipW>window.innerWidth ? tooltip.x-tipW-20 : tooltip.x;
        return (
          <div style={{ position:"fixed", left, top:tooltip.y, width:tipW, background:C.surface, border:`1px solid ${C.warm}`, borderRadius:8, padding:"12px 14px", zIndex:999, boxShadow:"0 4px 16px rgba(44,44,30,0.18)", pointerEvents:"none", fontFamily:"Inter, sans-serif" }}>
            <div style={{ marginBottom:8 }}>
              <span style={{ fontSize:11, color:C.textLt }}>{acc.name} · {day.date} {MONTH_GEN[day.month]} {BASE.getFullYear()}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {items.map((item,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, color: item.type==="in"?C.sage:C.danger, fontWeight:700, flexShrink:0 }}>{item.type==="in"?"↑":"↓"}</span>
                  <span style={{ fontSize:12, color:C.textDk, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</span>
                  <span style={{ fontSize:12, fontWeight:600, color: item.type==="in"?C.sage:C.textDk, fontVariantNumeric:"tabular-nums", flexShrink:0 }}>{ruFmt(item.amount)} ₽</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${C.ivory}`, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:C.textLt }}>Нажмите для деталей</span>
              <span style={{ fontSize:11, fontWeight:600, color: day.state==="cashgap"?C.danger:C.textLt }}>= {fmtBalance(day[tooltip.accKey].balance)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── GridDayCell ─────────────────────────────────────── */
function GridDayCell({ day, isWeekend, dense, onClick }: {
  day: CalendarDay | null;
  isWeekend: boolean;
  dense: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);

  if (!day) {
    return (
      <div style={{ minHeight: GRID_CELL_H, background: C.ivory, border:`1px solid ${C.warm}`, margin:-0.5 }} />
    );
  }

  // Фон: только кассовый разрыв красный, выходные чуть серее, остальные белые
  const baseBg  = day.state === "cashgap" ? C.danger12 : isWeekend ? C.ivory : C.surface;
  // Рамки: единый нейтральный (сегодня выделяем кружком на дате, не рамкой)
  const border  = `1px solid ${C.warm}`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{ minHeight: GRID_CELL_H, background: hov ? C.beige40 : baseBg, border, cursor:"pointer", padding:"7px 9px", display:"flex", flexDirection:"column", transition:"background 0.1s", margin:-0.5 }}
    >
      {/* Date number */}
      <div style={{ marginBottom: day.state==="cashgap" ? 3 : 6 }}>
        {day.isToday ? (
          <span style={{ display:"inline-flex", width:24, height:24, borderRadius:"50%", background:C.sage, alignItems:"center", justifyContent:"center", color:"#FAFAF5", fontSize:13, fontWeight:700 }}>
            {day.date}
          </span>
        ) : (
          <span style={{ fontSize:13, fontWeight: isWeekend?400:600, color: C.textDk, opacity: isWeekend ? 0.5 : 1 }}>{day.date}</span>
        )}
      </div>

      {/* Cashgap label */}
      {day.state==="cashgap" && (
        <div style={{ display:"flex", alignItems:"center", gap:2, marginBottom:4 }}>
          <AlertTriangle size={8} color={C.danger} />
          <span style={{ fontSize:9, color:C.danger, fontWeight:600, whiteSpace:"nowrap" }}>Кассовый разрыв</span>
        </div>
      )}

      {dense ? (
        <span style={{ fontSize:13, fontWeight:700, color: day.total.balance<0?C.danger:C.textDk, fontVariantNumeric:"tabular-nums", marginTop:"auto" }}>
          {fmtBalance(day.total.balance)}
        </span>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:1, marginTop:"auto", fontVariantNumeric:"tabular-nums" }}>
          <div style={{ fontSize:12, fontWeight:500, color:C.sage }}>↑ {fmtAmt(day.total.income)}</div>
          <div style={{ fontSize:12, fontWeight:500, color:C.danger }}>↓ {fmtAmt(day.total.expense)}</div>
          <div style={{ fontSize:13, fontWeight:700, color: day.total.balance<0?C.danger:C.textDk, marginTop:1 }}>
            = {fmtBalance(day.total.balance)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Drag-and-drop types ─────────────────────────────── */
const DND_TYPE = "PAYMENT_CELL";

interface DragItem {
  fromDate:  number;  // day.date
  fromMonth: number;
  amount:    number;
  accKey:    AccKey;
}

/**
 * DraggableCellRow — ячейка, которую можно перетащить на другой день.
 * При drag начинается с указанной ячейки, при drop вызывается onDropReschedule.
 */
function DraggableCellRow({
  entry, height, bg, bgHover, dense, fromDate, fromMonth, accKey, canDrag = true, onDropReschedule, ...rest
}: CellRowProps & {
  fromDate: number; fromMonth: number; accKey: AccKey;
  canDrag?: boolean;
  onDropReschedule?: (from: DragItem, toDate: number, toMonth: number) => void;
}) {
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DND_TYPE,
    item: { fromDate, fromMonth, amount: entry.expense, accKey },
    canDrag: () => canDrag && entry.expense > 0,  // блокируем drag без разрешения
    collect: m => ({ isDragging: m.isDragging() }),
  });

  return (
    <div ref={canDrag ? (drag as unknown as React.Ref<HTMLDivElement>) : undefined}
      style={{ opacity: isDragging ? 0.45 : 1, cursor: canDrag && entry.expense > 0 ? "grab" : "default", position: "relative" }}>
      {!dense && entry.expense > 0 && (
        <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", color: C.warm, opacity: 0.6, zIndex: 1, pointerEvents: "none" }}>
          <GripVertical size={10} />
        </div>
      )}
      <CellRow entry={entry} height={height} bg={bg} bgHover={bgHover} dense={dense} {...rest} />
    </div>
  );
}

/**
 * DroppableColumn — обёртка вокруг колонки дня, принимает drop.
 */
function DroppableColumn({
  day, children, onDropReschedule,
}: {
  day: CalendarDay;
  children: React.ReactNode;
  onDropReschedule?: (from: DragItem, toDate: number, toMonth: number) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DND_TYPE,
    canDrop: item => item.fromDate !== day.date || item.fromMonth !== day.month,
    drop: item => onDropReschedule?.(item, day.date, day.month),
    collect: m => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });

  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>}
      style={{
        position: "relative",
        outline: isOver && canDrop ? `2px dashed ${C.sage}` : undefined,
        background: isOver && canDrop ? C.sage10 : undefined,
        transition: "outline 0.1s, background 0.1s",
      }}>
      {children}
    </div>
  );
}

/* ── CellRow (matrix) ────────────────────────────────── */
interface CellRowProps {
  entry: DayEntry; height: number; bg: string; bgHover?: string;
  dense?: boolean; isTotalRow?: boolean; confirmedAmt?: number;
  onClick?: () => void; onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: () => void;
}
function CellRow({ entry, height, bg, bgHover, dense, isTotalRow, confirmedAmt, onClick, onMouseEnter, onMouseLeave }: CellRowProps) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={e => { setHov(true); onMouseEnter?.(e); }} onMouseLeave={() => { setHov(false); onMouseLeave?.(); }} onClick={onClick}
      style={{ height, boxSizing:"border-box" as const, background: hov?(bgHover??C.beige40):bg, borderBottom:`1px solid ${C.warm}`, padding: dense?"0 12px":"8px 12px", display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"center", gap: dense?0:2, cursor: isTotalRow?"default":"pointer", transition:"background 0.1s, height 0.15s", fontVariantNumeric:"tabular-nums", userSelect:"none" }}>
      {dense ? (
        <span style={{ fontSize:14, fontWeight:700, color: entry.balance<0?C.danger:entry.balance===0?C.textLt:C.textDk }}>{fmtBalance(entry.balance)}</span>
      ) : (
        <>
          <div style={{ fontSize:13, fontWeight:500, color:C.sage }}><span style={{ opacity:0.6 }}>↑</span>{" "}{fmtAmt(entry.income)}</div>
          <div style={{ fontSize:13, fontWeight:500, color:C.danger }}><span style={{ opacity:0.6 }}>↓</span>{" "}{fmtAmt(entry.expense)}</div>
          <div style={{ fontSize:14, fontWeight:700, color: entry.balance<0?C.danger:C.textDk, marginTop:3 }}>
            <span style={{ opacity:0.45, fontSize:11 }}>=</span>{" "}{fmtBalance(entry.balance)}
          </div>
          {confirmedAmt != null && confirmedAmt > 0 && (
            <div style={{ fontSize:10, color:C.sage, marginTop:2, display:"flex", alignItems:"center", gap:3 }}>
              <span>✓</span>
              <span>{fmtAmt(confirmedAmt)} подтверждено</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── DateInput — text field + native date picker ──── */
function DateInput({ value, onChange, placeholder = "дд.мм.гггг" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const toISO = (s: string) => {
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!m) return "";
    return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  };
  const fromISO = (s: string) => {
    if (!s) return "";
    const [y, mo, d] = s.split("-");
    return `${d}.${mo}.${y}`;
  };
  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:118, padding:"5px 30px 5px 8px", border:`1px solid ${C.warm}`, borderRadius:5, fontSize:13, color:C.textDk, background:C.surface, outline:"none", fontFamily:"Inter, sans-serif", textAlign:"center" }}
      />
      <input
        ref={ref}
        type="date"
        value={toISO(value)}
        onChange={e => onChange(fromISO(e.target.value))}
        style={{ position:"absolute", width:0, height:0, opacity:0, pointerEvents:"none", border:"none" }}
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => (ref.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.()}
        title="Открыть календарь"
        style={{ position:"absolute", right:6, background:"none", border:"none", cursor:"pointer", color:C.olive, display:"flex", padding:2 }}
      >
        <CalIcon size={13} />
      </button>
    </div>
  );
}

/* ── Legend ─────────────────────────────────────────── */
function Legend() {
  return (
    <div style={{ display:"flex", gap:20, marginTop:14, flexWrap:"wrap" }}>
      {/* bg принимает прямой CSS-цвет или var(), не парсим hex */}
      <LegendItem bg={C.surface}  borderColor={C.warm}   label="Положительный / нулевой остаток" />
      <LegendItem bg={C.danger12} borderColor={C.danger}  label="Кассовый разрыв" />
      <LegendItem bg={C.sage}     borderColor={C.sage}    label="Сегодня (кружок)" />
    </div>
  );
}
function LegendItem({ bg, borderColor, label }: { bg: string; borderColor: string; label: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ width:14, height:14, borderRadius:3, background:bg, border:`1.5px solid ${borderColor}`, flexShrink:0 }} />
      <span style={{ fontSize:12, color:C.textLt }}>{label}</span>
    </div>
  );
}
