import { useState, useEffect } from "react";
import { X, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { dateRu } from "../utils/validation";
import { getAccountCurrency, formatAmount, getCurrencySymbol } from "../utils";
import * as api from "../../api";
import type { ApprovalStageInfo, ApprovalRoute } from "../../api";
import { ApprovalStepper } from "./ApprovalStepper";
import { useAuth } from "../context/AuthContext";

// Maps calendar acc keys to account display names
const ACC_KEY_TO_NAME: Record<string, string> = {
  acc1:  "Расчётный №1",
  acc2:  "Расчётный №2",
  cash:  "Касса",
  total: "Расчётный №1",
};

interface RequestDrawerProps {
  onClose:              () => void;
  isCashGap?:           boolean;
  deficitAmount?:       number;
  onReschedule?:        (from: string, to: string, amount: number, accKey?: string) => void;
  paymentAccKey?:       string;
  canApprove?:          boolean;
  /** FIX #3: дата кликнутой ячейки — используется как from-дата переноса */
  initialPaymentDate?:  string;
  /** FIX #3: сумма расхода кликнутой ячейки — используется как сумма переноса */
  initialExpense?:      number;
  /** ID заявки для загрузки маршрута согласования */
  paymentId?:           number;
  /** Вызывается после approve/reject — родитель может обновить строку в таблице */
  onApprovalChanged?:   (paymentId: number, stages: ApprovalStageInfo[]) => void;
}

type DrawerTab    = "history" | "log";
type DrawerStatus = "pending" | "approved" | "rejected";

interface HistoryEntry { employee: string; decision: string; comment: string; date: string }
interface LogEntry     { text: string; date: string; user: string }

const INITIAL_HISTORY: HistoryEntry[] = [
  { employee: "Иванова М.С.", decision: "Черновик",        comment: "Заявка создана",                   date: "15.06.2026 11:00" },
  { employee: "Иванова М.С.", decision: "На согласовании", comment: "Отправлена на рассмотрение",        date: "15.06.2026 14:32" },
  { employee: "Козлова Е.В.", decision: "Согласована",     comment: "Документы проверены, всё верно",    date: "17.06.2026 09:15" },
  { employee: "Петров И.А.",  decision: "На согласовании", comment: "Передано казначею на утверждение",  date: "18.06.2026 10:00" },
];

const INITIAL_LOG: LogEntry[] = [
  { text: 'Статус изменён: "Черновик" → "На согласовании"',    date: "15.06.2026 14:32", user: "Иванова М.С." },
  { text: "Сумма изменена: 100 000,00 ₽ → 125 000,00 ₽",      date: "16.06.2026 09:10", user: "Иванова М.С." },
  { text: 'Статья изменена: "Прочие расходы" → "Аренда офиса"',date: "16.06.2026 09:11", user: "Иванова М.С." },
  { text: 'Статус изменён: "На согласовании" → "Согласована"',  date: "17.06.2026 09:15", user: "Козлова Е.В." },
  { text: 'Статус изменён: "Согласована" → "На согласовании"',  date: "18.06.2026 10:00", user: "Петров И.А."  },
];

const STATUS_LABEL: Record<DrawerStatus, string> = {
  pending:  "На согласовании",
  approved: "Согласована",
  rejected: "Отклонена",
};

const STATUS_BADGE: Record<DrawerStatus, { bg: string; color: string }> = {
  pending:  C.badge.pending,
  approved: C.badge.approved,
  rejected: C.badge.rejected,
};

function getBadgeStyle(decision: string): { bg: string; color: string } {
  switch (decision) {
    case "Черновик":        return C.badge.draft;
    case "На согласовании": return C.badge.pending;
    case "Согласована":     return C.badge.approved;
    case "В реестре":       return C.badge.inRegistry;
    case "Оплачена":        return C.badge.paid;
    case "Отклонена":       return C.badge.rejected;
    default:                return C.badge.draft;
  }
}

function ruFmt(n: number) {
  const s = Math.floor(Math.abs(n)).toString();
  const p: string[] = [];
  for (let i = s.length; i > 0; i -= 3) p.unshift(s.slice(Math.max(0, i - 3), i));
  return p.join(" ");
}

function nowStamp() {
  return "26.06.2026 " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// PAYMENT_AMOUNT: заменён на динамическое значение из кликнутой ячейки (initialExpense)

export function RequestDrawer({ onClose, isCashGap, deficitAmount, onReschedule, canApprove = true, paymentAccKey = "acc1", initialPaymentDate, initialExpense, paymentId = 2847, onApprovalChanged }: RequestDrawerProps) {
  const accountName = ACC_KEY_TO_NAME[paymentAccKey] ?? "Расчётный №1";
  const currency    = getAccountCurrency(accountName);
  const currSym     = getCurrencySymbol(currency);
  const { showToast } = useToast();
  const { user }      = useAuth();

  const [approvalStages, setApprovalStages] = useState<ApprovalStageInfo[]>([]);
  const [approvalRoute,  setApprovalRoute]  = useState<ApprovalRoute | undefined>();

  useEffect(() => {
    api.approvals.getApproval(paymentId).then(a => {
      setApprovalStages((a as any)?.stages ?? []);
      if ((a as any)?.routeId) {
        api.approvals.getRoutes().then(routes => {
          setApprovalRoute((routes as ApprovalRoute[]).find(r => r.id === (a as any).routeId));
        });
      }
    });
  }, [paymentId]);

  const [tab,          setTab]          = useState<DrawerTab>("history");
  const [status,       setStatus]       = useState<DrawerStatus>("pending");
  const [history,      setHistory]      = useState<HistoryEntry[]>(INITIAL_HISTORY);
  const [log,          setLog]          = useState<LogEntry[]>(INITIAL_LOG);

  // Sync "История согласований" from real approval stages whenever they change
  useEffect(() => {
    const DECISION_LABEL: Record<string, string> = {
      approved: "Согласована",
      rejected: "Отклонена",
      skipped:  "Пропущено",
    };
    const stageEntries: HistoryEntry[] = approvalStages
      .filter(s => s.status === "approved" || s.status === "rejected" || s.status === "skipped")
      .map(s => ({
        employee: s.assignee,
        decision: DECISION_LABEL[s.status] ?? s.status,
        comment:  s.comment ?? "",
        date:     s.actionDate ?? "—",
      }));
    if (stageEntries.length > 0) {
      // Real stage data takes priority over static demo rows
      setHistory(stageEntries);
    }
    // If no completed stages yet, INITIAL_HISTORY remains (demo data)
  }, [approvalStages]);
  const [paymentDate,  setPaymentDate]  = useState(initialPaymentDate ?? "29.06.2026");
  const [showDatePick, setShowDatePick] = useState(false);
  const [newDate,      setNewDate]      = useState(paymentDate);
  const [dateError,    setDateError]    = useState("");

  function handleDateSave() {
    const err = dateRu(newDate);
    if (err) { setDateError(err); return; }
    setDateError("");
    const stamp = nowStamp();
    const old = paymentDate;
    onReschedule?.(old, newDate, initialExpense ?? 90000, paymentAccKey);
    setPaymentDate(newDate);
    setLog(l => [...l, { text: `Дата перенесена: ${old} → ${newDate}`, date: stamp, user: "Петров И.А." }]);
    setShowDatePick(false);
    showToast("Дата перенесена, остатки пересчитаны", "success");
  }

  const badge = STATUS_BADGE[status];

  return (
    <div style={{
      position: "fixed", top: 56, right: 0, bottom: 0, width: 480,
      background: C.surface, borderLeft: `1px solid ${C.warm}`,
      boxShadow: "-2px 0 16px rgba(44,44,30,0.12)",
      display: "flex", flexDirection: "column",
      zIndex: 500, fontFamily: "Inter, sans-serif", overflowY: "auto",
    }}>

      {/* ── Cash-gap warning ── */}
      {isCashGap && (
        <div style={{ background: C.danger12, borderBottom: `2px solid ${C.danger}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <AlertTriangle size={16} color={C.danger} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.danger }}>
            Кассовый разрыв: −{ruFmt(deficitAmount ?? 0)} {currSym}
          </span>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}`, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>Заявка № 2847</h2>
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "3px 10px", borderRadius: 6,
            background: badge.bg, color: badge.color,
            fontSize: 12, fontWeight: 500, alignSelf: "flex-start",
            transition: "background 0.3s, color 0.3s",
          }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex", borderRadius: 6, marginTop: 2 }}>
          <X size={18} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Requisites block */}
        <div style={{ background: C.ivory, borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.textDk, marginBottom: 14, fontVariantNumeric: "tabular-nums" }}>
            {formatAmount(initialExpense ?? 90000, currency)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {[
              { label: "Счёт",       value: `${accountName} (${currency})`   },
              { label: "Дата",       value: paymentDate            },
              { label: "Контрагент", value: "ООО Поставщик Альфа" },
              { label: "Статья",     value: "Аренда офиса"        },
              { label: "Приоритет",  value: null, priority: true   },
              { label: "Инициатор",  value: "Иванова М.С."        },
            ].map((row, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, color: C.textLt, marginBottom: 2 }}>{row.label}</div>
                {row.priority ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.danger, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>Высокий</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{row.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Перенести дату — единственное действие вне маршрута согласования */}
        {onReschedule && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowDatePick(v => !v); setNewDate(paymentDate); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 8,
              background: showDatePick ? C.hdr : C.ivory,
              color: C.textDk,
              border: showDatePick ? `1.5px solid ${C.sage}` : `1.5px solid ${C.warm}`,
              fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Calendar size={13} />
              Перенести дату
            </button>
          </div>
        )}

        {/* Inline date picker */}
        {showDatePick && (
          <div style={{
            background: C.ivory, border: `1.5px solid ${C.sage}`,
            borderRadius: 10, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>Новая дата платежа</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  placeholder="дд.мм.гггг"
                  value={newDate}
                  onChange={e => { setNewDate(e.target.value); setDateError(""); }}
                  style={{
                    width: "100%", padding: "9px 36px 9px 12px",
                    border: dateError ? `1.5px solid ${C.danger}` : `1.5px solid ${C.sage}`,
                    borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk,
                    outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box",
                  }}
                />
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.olive, display: "flex", pointerEvents: "none" }}>
                  <Calendar size={14} />
                </div>
              </div>
              <button onClick={handleDateSave} style={{
                padding: "9px 16px", borderRadius: 6,
                background: C.sage, color: C.surface, border: "none",
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>Сохранить</button>
            </div>
            {dateError && (
              <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{dateError}</div>
            )}
            <div style={{ marginTop: 4 }}>
              <button onClick={() => { setShowDatePick(false); setDateError(""); }} style={{
                padding: "7px 10px", borderRadius: 6, background: "transparent",
                color: C.textLt, border: `1px solid ${C.warm}`,
                fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>Отмена</button>
            </div>
          </div>
        )}

        {/* ── Маршрут согласования ── */}
        <div style={{ background: C.ivory50, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.warm}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textDk, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: C.sage10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.sage }}>✓</span>
            Маршрут согласования
          </div>
          <ApprovalStepper
            stages={approvalStages}
            route={approvalRoute}
            currentRole={
              user?.role === "manager"   ? "manager"   :
              user?.role === "treasurer" ? "treasurer" :
              user?.role === "admin"     ? "manager"   :  // admin can act on any stage
              undefined
            }
            paymentId={paymentId}
            onApprove={async (stageId, comment) => {
              await api.approvals.approveStage(paymentId, stageId, comment);
              const updated = await api.approvals.getApproval(paymentId);
              const newStages = (updated as any)?.stages ?? [];
              setApprovalStages(newStages);
              onApprovalChanged?.(paymentId, newStages);
              showToast("Этап согласован", "success");
            }}
            onReject={async (stageId, comment) => {
              await api.approvals.rejectStage(paymentId, stageId, comment);
              const updated = await api.approvals.getApproval(paymentId);
              const newStages = (updated as any)?.stages ?? [];
              setApprovalStages(newStages);
              onApprovalChanged?.(paymentId, newStages);
              showToast("Этап отклонён", "error");
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: `1px solid ${C.warm}`, display: "flex" }}>
          {([
            { id: "history" as DrawerTab, label: "История согласований" },
            { id: "log"     as DrawerTab, label: "Журнал изменений"     },
          ]).map(({ id, label }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: "9px 16px", background: "none", border: "none",
                borderBottom: active ? `2px solid ${C.sage}` : "2px solid transparent",
                marginBottom: -1, color: active ? C.textDk : C.textLt,
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "color 0.15s",
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* История согласований */}
        {tab === "history" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.hdr }}>
                  {["Сотрудник", "Решение", "Комментарий", "Дата"].map(col => (
                    <th key={col} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => {
                  const badge = getBadgeStyle(row.decision);
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.ivory50 }}>
                      <td style={{ padding: "9px 10px", color: C.textDk, whiteSpace: "nowrap" }}>{row.employee}</td>
                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 500 }}>
                          {row.decision}
                        </span>
                      </td>
                      <td style={{ padding: "9px 10px", color: C.textLt, fontSize: 12, maxWidth: 150 }}>
                        {row.comment || "—"}
                      </td>
                      <td style={{ padding: "9px 10px", color: C.textLt, fontSize: 12, whiteSpace: "nowrap" }}>
                        {row.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Журнал изменений */}
        {tab === "log" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {log.map((entry, i) => (
              <div key={i} style={{ padding: "11px 0", borderBottom: `1px solid ${C.ivory}`, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 13, color: C.textDk }}>{entry.text}</div>
                <div style={{ fontSize: 11, color: C.textLt }}>{entry.date} · {entry.user}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
