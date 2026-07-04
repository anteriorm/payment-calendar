import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalIcon, GripVertical } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { C } from "../tokens";
import { ruFmt, fmtAmt, fmtBalance, kopecksToRub } from "../utils";
import * as api from "../../api";

type Period   = "week" | "month" | "quarter" | "custom";
type DayState = "positive" | "cashgap" | "zero";
type AccKey   = "acc1" | "acc2" | "cash";

export interface SelectedCell {
  dayDate: number; accKey: AccKey; isCashGap?: boolean; deficitAmount?: number;
  cellDate?: string; cellIncome?: number; cellExpense?: number; cellBalance?: number; cellAccountName?: string;
  isoDate?: string;
}

interface DayEntry { income: number; expense: number; balance: number; }

interface CalendarDay {
  date: number; month: number; year: number; dayName: string;
  state: DayState; isToday: boolean; isWeekend: boolean;
  acc1: DayEntry; acc2: DayEntry; cash: DayEntry; total: DayEntry;
}

const DAY_SHORT = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const MONTH_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MONTH_NOM = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAY_NAMES_GRID = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const DEFAULT_ACCOUNTS: { key: AccKey; name: string }[] = [
  { key: "acc1", name: "Счёт 1" },
  { key: "acc2", name: "Счёт 2" },
  { key: "cash", name: "Касса" },
];

const PERIOD_LABELS: Record<Period, string> = { week: "Неделя", month: "Месяц", quarter: "Квартал", custom: "Период" };
const HDR_H = 70, ACCT_W = 180, DAY_MIN = 142, SCROLL_PAD = 24;
const DENSE_ROW_H = 40, DENSE_TOTAL_H = 48, FULL_ROW_H = 72, FULL_TOTAL_H = 82;
const GRID_CELL_H = 104;

function todayISO(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function addDays(iso: string, n: number): string { const [y,m,dd] = iso.split("-").map(Number); const d = new Date(y, m-1, dd+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function toISO(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function daysBetween(a: string, b: string): number { const [ay,am,ad] = a.split("-").map(Number); const [by,bm,bd] = b.split("-").map(Number); return Math.max(1, Math.round((new Date(by,bm-1,bd).getTime() - new Date(ay,am-1,ad).getTime()) / 86400000) + 1); }
function formatDateRu(d: Date): string { return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; }
function parseDateRu(s: string): Date | null { const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (!m) return null; const d = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(d.getTime()) ? null : d; }

function emptyEntry(): DayEntry { return { income: 0, expense: 0, balance: 0 }; }
function emptyDay(d: Date): CalendarDay {
  return { date: d.getDate(), month: d.getMonth(), year: d.getFullYear(), dayName: DAY_SHORT[d.getDay()], state: "positive", isToday: false, isWeekend: d.getDay()===0||d.getDay()===6, acc1: emptyEntry(), acc2: emptyEntry(), cash: emptyEntry(), total: emptyEntry() };
}

function getColBg(s: DayState) { return s === "cashgap" ? C.danger12 : C.surface; }

interface TooltipState { dayDate: number; accKey: AccKey; x: number; y: number; isoDate: string; }
interface PaidConfirmation { dateStr: string; amount: number; }

interface PaymentCalendarProps {
  onCreateRequest?: () => void;
  onSelectRequest?: (cell: SelectedCell) => void;
  onGoToRegistry?: () => void;
  onRescheduleReady?: (fn: (from: string, to: string, amount: number, accKey?: AccKey) => void) => void;
  paidConfirmations?: PaidConfirmation[];
  canReschedule?: boolean;
}

export function PaymentCalendar({ onCreateRequest, onSelectRequest, onGoToRegistry, onRescheduleReady, paidConfirmations, canReschedule = false }: PaymentCalendarProps) {
  const [apiDays, setApiDays] = useState<Map<string, CalendarDay>>(new Map());
  const [accounts, setAccounts] = useState<{ key: AccKey; name: string }[]>(DEFAULT_ACCOUNTS);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("week");
  const [dayOffset, setDayOffset] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [dense, setDense] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [customFrom, setCustomFrom] = useState(formatDateRu(new Date()));
  const [customTo, setCustomTo] = useState(formatDateRu(new Date(Date.now() + 6 * 86400000)));
  const [statusFilter, setStatusFilter] = useState("");

  const today = todayISO();
  const anchorDate = addDays(today, dayOffset);

  // Загружаем счета из API при монтировании
  useEffect(() => {
    api.accounts.getAll()
      .then(data => {
        const accKeys: AccKey[] = ["acc1", "acc2", "cash"];
        const mapped = (data as any[]).slice(0, 3).map((a: any, i: number) => ({ key: accKeys[i], name: a.name }));
        if (mapped.length > 0) setAccounts(mapped);
      })
      .catch(() => {});
  }, []);

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    api.calendar.get({ start_date: start, end_date: end })
      .then(data => {
        const map = new Map<string, CalendarDay>();
        // Собираем уникальные account_id для маппинга acc1/acc2/cash
        const accountIds = new Set<number>();
        (data as any[]).forEach(row => { if (row.account_id !== null) accountIds.add(row.account_id); });
        const sortedIds = [...accountIds].sort((a, b) => a - b);
        const accKeyMap = new Map<number, AccKey>();
        sortedIds.forEach((id, i) => accKeyMap.set(id, i === 0 ? "acc1" : i === 1 ? "acc2" : "cash"));

        (data as any[]).forEach(row => {
          if (row.account_id === null) {
            const existing = map.get(row.date) || emptyDay(new Date(row.date + "T12:00:00"));
            const d = new Date(row.date + "T12:00:00");
            existing.date = d.getDate();
            existing.month = d.getMonth();
            existing.year = d.getFullYear();
            existing.dayName = DAY_SHORT[d.getDay()];
            existing.isWeekend = d.getDay() === 0 || d.getDay() === 6;
            existing.isToday = row.date === today;
            existing.total = { income: kopecksToRub(row.income_total), expense: kopecksToRub(row.expense_total), balance: kopecksToRub(row.closing_balance) };
            existing.state = row.has_cash_gap ? "cashgap" : row.closing_balance === 0 ? "zero" : "positive";
            map.set(row.date, existing);
          } else {
            const existing = map.get(row.date) || emptyDay(new Date(row.date + "T12:00:00"));
            const entry: DayEntry = { income: kopecksToRub(row.income_total), expense: kopecksToRub(row.expense_total), balance: kopecksToRub(row.closing_balance) };
            const key = accKeyMap.get(row.account_id) || "cash";
            existing[key] = entry;
            map.set(row.date, existing);
          }
        });
        setApiDays(map);
      })
      .catch((err) => { console.error("[Calendar] API error:", err); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const customFromDate = parseDateRu(customFrom);
    const customToDate = parseDateRu(customTo);
    let start: string, end: string;
    if (period === "week") { start = anchorDate; end = addDays(anchorDate, 6); }
    else if (period === "month") { const d = new Date(anchorDate + "T12:00:00"); start = toISO(new Date(d.getFullYear(), d.getMonth(), 1)); end = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
    else if (period === "quarter") { const d = new Date(anchorDate + "T12:00:00"); const qm = Math.floor(d.getMonth() / 3) * 3; start = toISO(new Date(d.getFullYear(), qm, 1)); end = toISO(new Date(d.getFullYear(), qm + 3, 0)); }
    else { start = customFromDate ? toISO(customFromDate) : anchorDate; end = customToDate ? toISO(customToDate) : addDays(anchorDate, 6); }
    fetchData(start, end);
  }, [period, dayOffset, customFrom, customTo]);

  const getDay = useCallback((iso: string): CalendarDay => { return apiDays.get(iso) || emptyDay(new Date(iso + "T12:00:00")); }, [apiDays]);

  const reschedulePayment = useCallback((fromStr: string, toStr: string, amount: number, accKey: AccKey = "acc1") => {
    const from = parseDateRu(fromStr); const to = parseDateRu(toStr);
    if (!from || !to) return;
    const fromISO = toISO(from); const toISO_ = toISO(to);
    setApiDays(prev => {
      const next = new Map(prev);
      const fromDay = next.get(fromISO); const toDay = next.get(toISO_);
      if (fromDay) { const clone = { ...fromDay, acc1: { ...fromDay.acc1 }, acc2: { ...fromDay.acc2 }, cash: { ...fromDay.cash }, total: { ...fromDay.total } }; const acc = clone[accKey]; const moved = Math.min(amount, acc.expense); acc.expense -= moved; acc.balance = acc.income - acc.expense; clone.total.expense = clone.acc1.expense + clone.acc2.expense + clone.cash.expense; clone.total.income = clone.acc1.income + clone.acc2.income + clone.cash.income; clone.total.balance = clone.total.income - clone.total.expense; clone.state = clone.total.balance < 0 ? "cashgap" : clone.total.balance === 0 ? "zero" : "positive"; next.set(fromISO, clone); }
      if (toDay) { const clone = { ...toDay, acc1: { ...toDay.acc1 }, acc2: { ...toDay.acc2 }, cash: { ...toDay.cash }, total: { ...toDay.total } }; const acc = clone[accKey]; acc.expense += amount; acc.balance = acc.income - acc.expense; clone.total.expense = clone.acc1.expense + clone.acc2.expense + clone.cash.expense; clone.total.income = clone.acc1.income + clone.acc2.income + clone.cash.income; clone.total.balance = clone.total.income - clone.total.expense; clone.state = clone.total.balance < 0 ? "cashgap" : clone.total.balance === 0 ? "zero" : "positive"; next.set(toISO_, clone); }
      return next;
    });
  }, []);

  useEffect(() => { onRescheduleReady?.(reschedulePayment); }, [reschedulePayment, onRescheduleReady]);

  const goBack = () => { if (period === "custom") setPageIndex(p => Math.max(0, p - 1)); else setDayOffset(p => p - (period === "month" ? 30 : period === "quarter" ? 90 : 7)); };
  const goFwd = () => { if (period === "custom") setPageIndex(p => p + 1); else setDayOffset(p => p + (period === "month" ? 30 : period === "quarter" ? 90 : 7)); };
  const goToday = () => { setDayOffset(0); setPageIndex(0); };

  const handleCellClick = (day: CalendarDay, accKey: AccKey) => {
    const isoDate = `${day.year}-${String(day.month + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`;
    const entry = day[accKey];
    const acc = accounts.find(a => a.key === accKey);
    onSelectRequest?.({
      dayDate: day.date, accKey,
      isCashGap: day.state === "cashgap",
      deficitAmount: day.state === "cashgap" ? day.total.balance : undefined,
      cellDate: `${String(day.date).padStart(2, "0")}.${String(day.month + 1).padStart(2, "0")}.${day.year}`,
      cellIncome: entry.income, cellExpense: entry.expense, cellBalance: entry.balance,
      cellAccountName: acc?.name || "",
      isoDate,
    });
  };
  const handleCellEnter = (e: React.MouseEvent, dayDate: number, accKey: AccKey, isoDate: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ dayDate, accKey, x: rect.right + 8, y: rect.top, isoDate });
  };

  const matrixDays: CalendarDay[] = [];
  const customFromDate = parseDateRu(customFrom); const customToDate = parseDateRu(customTo);
  let startDate: string, count: number;
  if (period === "week") { startDate = anchorDate; count = 7; }
  else if (period === "month") { const d = new Date(anchorDate + "T12:00:00"); startDate = toISO(new Date(d.getFullYear(), d.getMonth(), 1)); count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
  else if (period === "quarter") { const d = new Date(anchorDate + "T12:00:00"); const qm = Math.floor(d.getMonth() / 3) * 3; startDate = toISO(new Date(d.getFullYear(), qm, 1)); count = daysBetween(startDate, toISO(new Date(d.getFullYear(), qm + 3, 0))); }
  else { startDate = customFromDate ? toISO(customFromDate) : anchorDate; count = customToDate ? daysBetween(startDate, toISO(customToDate)) : 7; }
  for (let i = 0; i < Math.min(count, 90); i++) matrixDays.push(getDay(addDays(startDate, i)));

  const ROW_H = dense ? DENSE_ROW_H : FULL_ROW_H;
  const TOTAL_H = dense ? DENSE_TOTAL_H : FULL_TOTAL_H;
  const periodLabel = period === "month" ? `${MONTH_NOM[new Date(anchorDate + "T12:00:00").getMonth()]} ${new Date(anchorDate + "T12:00:00").getFullYear()}` : period === "quarter" ? `Квартал ${new Date(anchorDate + "T12:00:00").getFullYear()}` : period === "week" ? `${formatDateRu(new Date(anchorDate + "T12:00:00"))} — ${formatDateRu(new Date(addDays(anchorDate, 6) + "T12:00:00"))}` : "";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      {/* Control panel */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.warm}`, padding: "10px 24px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: C.ivory, borderRadius: 6, padding: 2, gap: 2 }}>
          {(["week","month","quarter","custom"] as Period[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setPageIndex(0); if (p !== "custom") setDayOffset(0); }}
              style={{ padding: "5px 13px", borderRadius: 4, border: "none", background: period === p ? C.sage : "transparent", color: period === p ? C.surface : C.textLt, fontSize: 13, fontWeight: period === p ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", background: C.ivory, borderRadius: 6, padding: 2, gap: 2 }}>
          {[false, true].map(d => (
            <button key={String(d)} onClick={() => setDense(d)}
              style={{ padding: "5px 11px", borderRadius: 4, border: "none", background: dense === d ? C.olive : "transparent", color: dense === d ? C.surface : C.textLt, fontSize: 12, fontWeight: dense === d ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              {d ? "Компактный" : "Развёрнутый"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={goBack} style={{ background: "none", border: `1px solid ${C.warm}`, borderRadius: 6, cursor: "pointer", color: C.textLt, padding: "4px 6px", display: "flex" }}><ChevronLeft size={16} /></button>
          {period === "custom" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12, color: C.textLt }}>с</span><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${C.warm}`, borderRadius: 5, fontSize: 13, color: C.textDk, background: C.surface, outline: "none", fontFamily: "Inter, sans-serif" }} />
              <span style={{ fontSize: 12, color: C.textLt }}>по</span><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${C.warm}`, borderRadius: 5, fontSize: 13, color: C.textDk, background: C.surface, outline: "none", fontFamily: "Inter, sans-serif" }} />
            </div>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 600, color: C.textDk, minWidth: 160, textAlign: "center" }}>{periodLabel}</span>
          )}
          <button onClick={goFwd} style={{ background: "none", border: `1px solid ${C.warm}`, borderRadius: 6, cursor: "pointer", color: C.textLt, padding: "4px 6px", display: "flex" }}><ChevronRight size={16} /></button>
          {dayOffset !== 0 && <button onClick={goToday} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.sage}`, background: C.sage10, color: C.sage, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: 2 }}>Сегодня</button>}
        </div>
        {(onCreateRequest || onGoToRegistry) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {onCreateRequest && <button onClick={onCreateRequest} style={{ padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Создать заявку</button>}
            {onGoToRegistry && <button onClick={onGoToRegistry} style={{ padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Сформировать реестр</button>}
          </div>
        )}
      </div>

      {/* Matrix view */}
      <div style={{ flex: 1, overflow: "auto", padding: `${SCROLL_PAD}px ${SCROLL_PAD}px 0` }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textLt }}>Загрузка данных календаря...</div>
        ) : (
          <div style={{ display: "flex", minWidth: "max-content", border: `1px solid ${C.warm}`, borderRadius: 8, boxShadow: "0 1px 3px rgba(44,44,30,0.10)" }}>
            {/* Sticky account names */}
            <div style={{ width: ACCT_W, flexShrink: 0, position: "sticky", left: 0, zIndex: 5, background: C.ivory, overflow: "hidden", borderRadius: "7px 0 0 7px", borderRight: `1px solid ${C.warm}` }}>
              <div style={{ height: HDR_H, background: C.ivory, borderBottom: `1px solid ${C.warm}` }} />
              {accounts.map(acc => (
                <div key={acc.key} style={{ height: ROW_H, background: C.ivory, borderBottom: `1px solid ${C.warm}`, display: "flex", alignItems: "center", padding: "0 14px", transition: "height 0.15s" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.textDk }}>{acc.name}</span>
                </div>
              ))}
              <div style={{ height: TOTAL_H, background: C.surface, borderTop: `2px solid ${C.warm}`, display: "flex", alignItems: "center", padding: "0 14px" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.textDk }}>Итого</span>
              </div>
            </div>

            {/* Day columns */}
            {matrixDays.map(day => {
              const isoDate = `${day.year}-${String(day.month + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`;
              return (
                <div key={isoDate} style={{ flex: 1, minWidth: DAY_MIN, border: `1px solid ${C.warm}`, marginLeft: -1 }}>
                  <div style={{ height: HDR_H, background: C.ivory, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "6px 4px", borderBottom: `1px solid ${C.warm}` }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.textLt }}>{day.dayName}</span>
                    {day.isToday ? (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", color: C.surface, fontSize: 14, fontWeight: 700 }}>{day.date}</div>
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{day.date}</span>
                    )}
                    {day.state === "cashgap" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 1 }}>
                        <AlertTriangle size={9} color={C.danger} />
                        <span style={{ fontSize: 10, color: C.danger, fontWeight: 600 }}>{"−" + ruFmt(Math.abs(day.total.balance)) + " ₽"}</span>
                      </div>
                    )}
                  </div>
                  {canReschedule ? (
                    <DroppableColumn day={day} isoDate={isoDate} onDropReschedule={(item, toIso) => { reschedulePayment(item.fromIso, toIso, item.amount, item.accKey); }}>
                      {accounts.map(acc => (
                        <DraggableCellRow key={`${isoDate}-${acc.key}`} entry={day[acc.key]} height={ROW_H} bg={getColBg(day.state)} dense={dense} fromIso={isoDate} accKey={acc.key} onClick={() => handleCellClick(day, acc.key)} onMouseEnter={e => handleCellEnter(e, day.date, acc.key, isoDate)} onMouseLeave={() => setTooltip(null)} />
                      ))}
                    </DroppableColumn>
                  ) : (
                    <div>
                      {accounts.map(acc => (
                        <CellRow key={`${isoDate}-${acc.key}`} entry={day[acc.key]} height={ROW_H} bg={getColBg(day.state)} dense={dense} onClick={() => handleCellClick(day, acc.key)} onMouseEnter={e => handleCellEnter(e, day.date, acc.key, isoDate)} onMouseLeave={() => setTooltip(null)} />
                      ))}
                    </div>
                  )}
                  <CellRow entry={day.total} height={TOTAL_H} bg={day.state === "cashgap" ? C.danger12 : C.surface} dense={dense} isTotalRow />
                </div>
              );
            })}
          </div>
        )}
        <div style={{ paddingBottom: 24, marginTop: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <LegendItem bg={C.surface} borderColor={C.warm} label="Положительный / нулевой остаток" />
          <LegendItem bg={C.danger12} borderColor={C.danger} label="Кассовый разрыв" />
          <LegendItem bg={C.sage} borderColor={C.sage} label="Сегодня" />
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (() => {
        const apiDay = apiDays.get(tooltip.isoDate);
        const day = matrixDays.find(d => {
          const iso = `${d.year}-${String(d.month + 1).padStart(2, "0")}-${String(d.date).padStart(2, "0")}`;
          return iso === tooltip.isoDate;
        });
        if (!apiDay && !day) return null;
        const entry = (apiDay || day!)[tooltip.accKey]; const acc = accounts.find(a => a.key === tooltip.accKey)!;
        const tipW = 260; const left = tooltip.x + tipW > window.innerWidth ? tooltip.x - tipW - 20 : tooltip.x;
        return (
          <div style={{ position: "fixed", left, top: tooltip.y, width: tipW, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, padding: "12px 14px", zIndex: 999, boxShadow: "0 4px 16px rgba(44,44,30,0.18)", pointerEvents: "none", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: 8 }}><span style={{ fontSize: 11, color: C.textLt }}>{acc.name} · {tooltip.dayDate}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 11, color: C.sage, fontWeight: 700 }}>↑</span><span style={{ fontSize: 12, color: C.textDk, flex: 1 }}>Приход</span><span style={{ fontSize: 12, fontWeight: 600, color: C.sage, fontVariantNumeric: "tabular-nums" }}>{ruFmt(entry.income)} ₽</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 11, color: C.danger, fontWeight: 700 }}>↓</span><span style={{ fontSize: 12, color: C.textDk, flex: 1 }}>Расход</span><span style={{ fontSize: 12, fontWeight: 600, color: C.textDk, fontVariantNumeric: "tabular-nums" }}>{ruFmt(entry.expense)} ₽</span></div>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.ivory}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: C.textLt }}>Нажмите для деталей</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: entry.balance < 0 ? C.danger : C.textLt }}>= {fmtBalance(entry.balance)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const DND_TYPE = "PAYMENT_CELL";
interface DragItem { fromIso: string; amount: number; accKey: AccKey; }

function DraggableCellRow({ entry, height, bg, dense, fromIso, accKey, ...rest }: CellRowProps & { fromIso: string; accKey: AccKey }) {
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DND_TYPE, item: { fromIso, amount: entry.expense, accKey },
    canDrag: () => entry.expense > 0,
    collect: m => ({ isDragging: m.isDragging() }),
  });
  return (
    <div ref={drag as unknown as React.Ref<HTMLDivElement>} style={{ opacity: isDragging ? 0.45 : 1, cursor: entry.expense > 0 ? "grab" : "default", position: "relative" }}>
      {!dense && entry.expense > 0 && <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", color: C.warm, opacity: 0.6, zIndex: 1, pointerEvents: "none" }}><GripVertical size={10} /></div>}
      <CellRow entry={entry} height={height} bg={bg} dense={dense} {...rest} />
    </div>
  );
}

function DroppableColumn({ day, isoDate, children, onDropReschedule }: { day: CalendarDay; isoDate: string; children: React.ReactNode; onDropReschedule?: (from: DragItem, toIso: string) => void }) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DND_TYPE,
    canDrop: item => item.fromIso !== isoDate,
    drop: item => onDropReschedule?.(item, isoDate),
    collect: m => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>}
      style={{ position: "relative", outline: isOver && canDrop ? `2px dashed ${C.sage}` : undefined, background: isOver && canDrop ? C.sage10 : undefined }}>
      {children}
    </div>
  );
}

interface CellRowProps {
  entry: DayEntry; height: number; bg: string; bgHover?: string;
  dense?: boolean; isTotalRow?: boolean; confirmedAmt?: number;
  onClick?: () => void; onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: () => void;
}

function CellRow({ entry, height, bg, bgHover, dense, isTotalRow, confirmedAmt, onClick, onMouseEnter, onMouseLeave }: CellRowProps) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={e => { setHov(true); onMouseEnter?.(e); }} onMouseLeave={() => { setHov(false); onMouseLeave?.(); }} onClick={onClick}
      style={{ height, boxSizing: "border-box" as const, background: hov ? (bgHover ?? C.beige40) : bg, borderBottom: `1px solid ${C.warm}`, padding: dense ? "0 12px" : "8px 12px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: dense ? 0 : 2, cursor: isTotalRow ? "default" : "pointer", transition: "background 0.1s, height 0.15s", fontVariantNumeric: "tabular-nums", userSelect: "none" }}>
      {dense ? (
        <span style={{ fontSize: 14, fontWeight: 700, color: entry.balance < 0 ? C.danger : entry.balance === 0 ? C.textLt : C.textDk }}>{fmtBalance(entry.balance)}</span>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.sage }}><span style={{ opacity: 0.6 }}>↑</span>{" "}{fmtAmt(entry.income)}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.danger }}><span style={{ opacity: 0.6 }}>↓</span>{" "}{fmtAmt(entry.expense)}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: entry.balance < 0 ? C.danger : C.textDk, marginTop: 3 }}><span style={{ opacity: 0.45, fontSize: 11 }}>=</span>{" "}{fmtBalance(entry.balance)}</div>
          {confirmedAmt != null && confirmedAmt > 0 && <div style={{ fontSize: 10, color: C.sage, marginTop: 2 }}><span>✓</span> {fmtAmt(confirmedAmt)} подтверждено</div>}
        </>
      )}
    </div>
  );
}

function LegendItem({ bg, borderColor, label }: { bg: string; borderColor: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1.5px solid ${borderColor}`, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: C.textLt }}>{label}</span>
    </div>
  );
}
