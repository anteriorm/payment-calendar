import { useState } from "react";
import { X, AlertTriangle, Calendar, Check } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { dateRu } from "../utils/validation";

interface RequestDrawerProps {
  onClose:          () => void;
  isCashGap?:       boolean;
  deficitAmount?:   number;
  onReschedule?:    (from: string, to: string, amount: number, accKey?: string) => void;
  paymentAccKey?:   string;  // счёт платежа ("acc1"|"acc2"|"cash"), для корректного переноса
  canApprove?:      boolean;
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

const PAYMENT_AMOUNT = 90000;

export function RequestDrawer({ onClose, isCashGap, deficitAmount, onReschedule, canApprove = true, paymentAccKey = "acc1" }: RequestDrawerProps) {
  const { showToast } = useToast();

  const [tab,          setTab]          = useState<DrawerTab>("history");
  const [status,       setStatus]       = useState<DrawerStatus>("pending");
  const [history,      setHistory]      = useState<HistoryEntry[]>(INITIAL_HISTORY);
  const [log,          setLog]          = useState<LogEntry[]>(INITIAL_LOG);
  const [paymentDate,  setPaymentDate]  = useState("29.06.2026");
  const [showReject,   setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDatePick, setShowDatePick] = useState(false);
  const [newDate,      setNewDate]      = useState(paymentDate);
  const [dateError,    setDateError]    = useState("");

  function handleApprove() {
    const stamp = nowStamp();
    setStatus("approved");
    setHistory(h => [...h, { employee: "Петров И.А.", decision: "Согласована", comment: "Утверждено казначеем", date: stamp }]);
    setLog(l => [...l, { text: 'Статус изменён: "На согласовании" → "Согласована"', date: stamp, user: "Петров И.А." }]);
    showToast("Заявка согласована", "success");
  }

  function handleRejectConfirm() {
    if (!rejectReason.trim()) return;
    const stamp = nowStamp();
    setStatus("rejected");
    setHistory(h => [...h, { employee: "Петров И.А.", decision: "Отклонена", comment: rejectReason, date: stamp }]);
    setLog(l => [...l, { text: 'Статус изменён: "На согласовании" → "Отклонена"', date: stamp, user: "Петров И.А." }]);
    setShowReject(false);
    setRejectReason("");
    showToast("Заявка отклонена", "error");
  }

  function handleDateSave() {
    const err = dateRu(newDate);
    if (err) { setDateError(err); return; }
    setDateError("");
    const stamp = nowStamp();
    const old = paymentDate;
    onReschedule?.(old, newDate, PAYMENT_AMOUNT, paymentAccKey); // передаём счёт платежа
    setPaymentDate(newDate);
    setLog(l => [...l, { text: `Дата перенесена: ${old} → ${newDate}`, date: stamp, user: "Петров И.А." }]);
    setShowDatePick(false);
    showToast("Дата перенесена, остатки пересчитаны", "success");
  }

  const badge     = STATUS_BADGE[status];
  const isPending = status === "pending";

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
            Кассовый разрыв: −{ruFmt(deficitAmount ?? 0)} ₽
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
            {ruFmt(PAYMENT_AMOUNT)},00 ₽
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {[
              { label: "Счёт",       value: "Расчётный счёт №1"   },
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

        {/* Action buttons */}
        {!showReject && (
          <div style={{ display: "flex", gap: 8 }}>
            {isPending && canApprove && (
              <button onClick={handleApprove} style={{
                flex: 1, padding: "9px 0", borderRadius: 8,
                background: C.sage, color: C.surface, border: "none",
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>Согласовать</button>
            )}
            {isPending && canApprove && (
              <button onClick={() => setShowReject(true)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8,
                background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}`,
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>Отклонить</button>
            )}
            {onReschedule && (
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
            )}
          </div>
        )}

        {/* Reject form */}
        {showReject && (
          <div style={{
            background: C.danger08, border: `1.5px solid ${C.danger}`,
            borderRadius: 10, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.danger }}>Причина отказа</div>
            <textarea
              autoFocus
              placeholder="Укажите причину отклонения заявки…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "9px 12px",
                border: `1px solid ${C.danger}`, borderRadius: 6,
                background: C.surface, fontSize: 13, color: C.textDk,
                outline: "none", resize: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleRejectConfirm} disabled={!rejectReason.trim()} style={{
                flex: 1, padding: "8px 0", borderRadius: 6,
                background: rejectReason.trim() ? C.danger : C.ivory,
                color: C.surface, border: "none", fontSize: 13, fontWeight: 500,
                cursor: rejectReason.trim() ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Check size={13} />
                Подтвердить отказ
              </button>
              <button onClick={() => { setShowReject(false); setRejectReason(""); }} style={{
                padding: "8px 16px", borderRadius: 6, background: "transparent",
                color: C.textLt, border: `1px solid ${C.warm}`,
                fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>Отмена</button>
            </div>
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
