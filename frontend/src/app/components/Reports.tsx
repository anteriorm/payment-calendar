import { useState, useEffect } from "react";
import { BarChart2, AlertTriangle, ArrowUpRight, ChevronDown, Download } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv, kopecksToRub } from "../utils";
import * as api from "../../api";

type TabId = "cashgaps" | "balances" | "planfact" | "exports";

interface ReportsProps { onGoToCalendar?: () => void; }

const TABS: { id: TabId; label: string }[] = [
  { id: "balances", label: "Остатки по счетам" },
  { id: "cashgaps", label: "Кассовые разрывы" },
  { id: "planfact", label: "План и факт" },
  { id: "exports",  label: "Выгрузки" },
];

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

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
function toISO(d: Date): string { return d.toISOString().slice(0, 10); }

export function Reports({ onGoToCalendar }: ReportsProps) {
  const [tab, setTab] = useState<TabId>("balances");
  const { showToast } = useToast();

  const [dateFrom, setDateFrom] = useState(toISO(firstOfMonth));
  const [dateTo, setDateTo] = useState(toISO(lastOfMonth));

  const [balances, setBalances] = useState<any[]>([]);
  const [cashGaps, setCashGaps] = useState<any[]>([]);
  const [planFact, setPlanFact] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const f = { date_from: dateFrom, date_to: dateTo };
    if (tab === "balances") {
      api.reports.getBalances(f).then(data => setBalances((data as any[]).map((r: any) => ({ ...r, opening: kopecksToRub(r.opening || 0), income: kopecksToRub(r.income || 0), expense: kopecksToRub(r.expense || 0), closing: kopecksToRub(r.closing || 0) })))).catch(() => showToast("Ошибка загрузки остатков", "error")).finally(() => setLoading(false));
    } else if (tab === "cashgaps") {
      api.reports.getCashGaps(f).then(data => setCashGaps((data as any[]).map((g: any) => ({ ...g, deficit: kopecksToRub(g.deficit || 0), top_amount: kopecksToRub(g.top_amount || 0) })))).catch(() => showToast("Ошибка загрузки кассовых разрывов", "error")).finally(() => setLoading(false));
    } else if (tab === "planfact") {
      api.reports.getPlanFact(f).then(data => setPlanFact((data as any[]).map((r: any) => ({ ...r, budget: kopecksToRub(r.budget || 0), fact: kopecksToRub(r.fact || 0) })))).catch(() => showToast("Ошибка загрузки план/факт", "error")).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, dateFrom, dateTo]);

  const handleExport = () => {
    if (tab === "balances") {
      exportCsv("Остатки_по_счетам.csv", ["Счёт", "Начало", "Приход", "Расход", "Конец"],
        balances.map((r: any) => [r.account, r.opening, r.income, r.expense, r.closing]));
      showToast("Остатки_по_счетам.csv скачан", "success");
    } else if (tab === "cashgaps") {
      exportCsv("Кассовые_разрывы.csv", ["Дата", "Счёт", "Дефицит", "Крупнейший платёж", "Сумма"],
        cashGaps.map((g: any) => [g.date, g.account, g.deficit, g.top_payer, g.top_amount]));
      showToast("Кассовые_разрывы.csv скачан", "success");
    } else if (tab === "planfact") {
      exportCsv("План_и_факт.csv", ["Период", "Статья", "Бюджет", "Факт"],
        planFact.map((r: any) => [r.period, r.item, r.budget, r.fact]));
      showToast("План_и_факт.csv скачан", "success");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.warm}`, padding: "18px 24px 0", flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textDk, margin: "0 0 16px" }}>Отчёты</h1>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                style={{ padding: "8px 20px", borderRadius: active ? "6px 6px 0 0" : 6, border: "none", background: active ? C.sage : C.ivory, color: active ? C.surface : C.textLt, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", position: "relative", bottom: active ? -1 : 0 }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Date filter bar */}
        <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.textLt }}>Период:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <span style={{ fontSize: 12, color: C.textLt }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <div style={{ flex: 1 }} />
          <button onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <BarChart2 size={14} /> Выгрузить в Excel
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textLt }}>Загрузка...</div>
        ) : (
          <>
            {tab === "balances" && <BalancesTab rows={balances} />}
            {tab === "cashgaps" && <CashGapsTab rows={cashGaps} onGoToCalendar={onGoToCalendar} />}
            {tab === "planfact" && <PlanFactTab rows={planFact} />}
            {tab === "exports" && <ExportsTab onDownload={(name, filename) => {
              if (tab === "balances") handleExport();
              else handleExport();
              showToast(`${filename} скачан`, "success");
            }} />}
          </>
        )}
      </div>
    </div>
  );
}

function BalancesTab({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <div style={{ padding: 48, textAlign: "center", color: C.textLt }}>Нет данных за выбранный период</div>;
  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.hdr }}>
            {["Счёт", "Остаток на начало", "Приход", "Расход", "Остаток на конец"].map(col => (
              <th key={col} style={{ padding: "11px 16px", textAlign: col === "Счёт" ? "left" : "right", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>{col}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((row: any, i: number) => {
              const closingColor = row.closing < row.opening ? C.danger : row.closing > row.opening ? C.sage : C.textDk;
              return (
                <tr key={i} style={{ background: row.is_total ? C.hdr : i % 2 === 0 ? C.surface : C.ivory50, borderBottom: `1px solid rgba(192,192,160,0.35)` }}>
                  <td style={{ padding: "12px 16px", color: C.textDk, fontWeight: row.is_total ? 700 : 600, whiteSpace: "nowrap" }}>{row.account}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: C.textDk, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtShort(row.opening)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: C.sage, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>↑ {fmtShort(row.income)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: C.danger, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>↓ {fmtShort(row.expense)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: row.is_total ? C.textDk : closingColor, fontWeight: row.is_total ? 700 : 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtShort(row.closing)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashGapsTab({ rows, onGoToCalendar }: { rows: any[]; onGoToCalendar?: () => void }) {
  const totalDeficit = rows.reduce((s: number, g: any) => s + g.deficit, 0);
  const gapWord = rows.length === 1 ? "разрыв" : rows.length < 5 ? "разрыва" : "разрывов";

  return (
    <div style={{ padding: 24 }}>
      {rows.length > 0 ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: C.danger12, border: `1px solid ${C.danger}`, marginBottom: 16, width: "fit-content" }}>
            <AlertTriangle size={13} color={C.danger} />
            <span style={{ fontSize: 12, color: C.danger, fontWeight: 500 }}>{rows.length} кассовых {gapWord} · {fmtFull(totalDeficit)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((gap: any, i: number) => (
              <div key={i} style={{ background: C.surface, borderRadius: "0 8px 8px 0", borderTop: `1px solid ${C.warm}`, borderRight: `1px solid ${C.warm}`, borderBottom: `1px solid ${C.warm}`, borderLeft: `4px solid ${C.danger}`, padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 11, color: C.textLt, marginBottom: 2 }}>Дата</div><div style={{ fontSize: 14, fontWeight: 600, color: C.textDk }}>{gap.date}</div></div>
                    <div><div style={{ fontSize: 11, color: C.textLt, marginBottom: 2 }}>Счёт</div><div style={{ fontSize: 13, color: C.textDk }}>{gap.account}</div></div>
                  </div>
                  <div><div style={{ fontSize: 11, color: C.textLt, marginBottom: 3 }}>Дефицит</div><div style={{ fontSize: 22, fontWeight: 700, color: C.danger, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{fmtFull(gap.deficit)}</div></div>
                  <div style={{ padding: "8px 12px", background: C.danger08, borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={13} color={C.danger} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.textLt }}>Крупнейший платёж: </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textDk }}>{gap.top_payer}</span>
                    <span style={{ fontSize: 12, color: C.textLt }}> — </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.danger, fontVariantNumeric: "tabular-nums" }}>{fmtShort(gap.top_amount)}</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, paddingTop: 4 }}>
                  <button onClick={onGoToCalendar} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 6, background: "transparent", border: `1.5px solid ${C.warm}`, color: C.sage, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
                    Перейти в календарь <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.textLt, fontSize: 14 }}>Кассовых разрывов в периоде не обнаружено</div>
      )}
    </div>
  );
}

function PlanFactTab({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <div style={{ padding: 48, textAlign: "center", color: C.textLt }}>Нет данных за выбранный период</div>;
  const totalBudget = rows.reduce((s: number, r: any) => s + r.budget, 0);
  const totalFact = rows.reduce((s: number, r: any) => s + r.fact, 0);
  const totalDiff = totalFact - totalBudget;
  const totalPct = totalBudget > 0 ? Math.round((totalFact / totalBudget) * 100) : 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.hdr }}>
            {["Статья", "Бюджет", "Факт", "Отклонение", "%"].map(col => (
              <th key={col} style={{ padding: "10px 16px", textAlign: col === "Статья" ? "left" : "right", fontWeight: 600, color: C.textDk, fontSize: 12 }}>{col}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((row: any, i: number) => {
              const diff = row.fact - row.budget;
              const pct = row.budget > 0 ? Math.round((row.fact / row.budget) * 100) : 0;
              const over = diff > 0;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.ivory50, borderBottom: `1px solid rgba(192,192,160,0.35)` }}>
                  <td style={{ padding: "11px 16px", color: C.textDk, fontWeight: 500 }}>{row.item}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.textDk }}>{fmtShort(row.budget)}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.textDk, fontWeight: 500 }}>{fmtShort(row.fact)}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: over ? C.danger : C.sage, fontWeight: 500 }}>{over ? "+" : "−"}{fmtShort(Math.abs(diff))}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: over ? C.danger : C.sage, fontWeight: 600 }}>{pct}%</td>
                </tr>
              );
            })}
            <tr style={{ background: C.hdr }}>
              <td style={{ padding: "12px 16px", fontWeight: 700, color: C.textDk }}>Итого</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: C.textDk }}>{fmtShort(totalBudget)}</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: C.textDk }}>{fmtShort(totalFact)}</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: totalDiff > 0 ? C.danger : C.sage }}>{totalDiff > 0 ? "+" : "−"}{fmtShort(Math.abs(totalDiff))}</td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: totalDiff > 0 ? C.danger : C.sage }}>{totalPct}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportsTab({ onDownload }: { onDownload: (name: string, filename: string) => void }) {
  const files = [
    { name: "Остатки по счетам", period: "Текущий период", file: "Ostatki.csv" },
    { name: "Кассовые разрывы", period: "Текущий период", file: "Cashgaps.csv" },
    { name: "План и факт", period: "Текущий период", file: "PlanFact.csv" },
  ];
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
      {files.map((f, i) => (
        <div key={i} style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.sage10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BarChart2 size={18} color={C.sage} /></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{f.name}</div><div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>{f.period}</div></div>
          <button onClick={() => onDownload(f.name, f.file)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <Download size={13} /> Скачать CSV
          </button>
        </div>
      ))}
    </div>
  );
}
