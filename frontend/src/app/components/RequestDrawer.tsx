import { useState, useEffect } from "react";
import { X, AlertTriangle, Calendar, Check, Loader2 } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { dateRu } from "../utils/validation";
import * as api from "../../api";

interface RequestDrawerProps {
  onClose:          () => void;
  isCashGap?:       boolean;
  deficitAmount?:   number;
  onReschedule?:    (from: string, to: string, amount: number, accKey?: string) => void;
  paymentAccKey?:   string;
  canApprove?:      boolean;
  cellDate?:        string;   // "дд.мм.гггг"
  cellIncome?:      number;
  cellExpense?:     number;
  cellBalance?:     number;
  cellAccountName?: string;
  isoDate?:         string;   // "гггг-мм-дд"
}

interface PaymentRow {
  id: number; amount: number; planned_date: string; status: string;
  counterparty: string; item: string; purpose: string; priority: string;
  account_name: string; creator_name: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик", pending: "На согласовании", approved: "Согласована",
  rejected: "Отклонена", in_registry: "В реестре", paid: "Оплачена",
};
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  draft: C.badge.pending, pending: C.badge.pending, approved: C.badge.approved,
  rejected: C.badge.rejected, in_registry: { bg: C.olive20, color: C.olive }, paid: C.badge.approved,
};
const PRIORITY_LABEL: Record<string, string> = { high: "Высокий", medium: "Средний", low: "Низкий" };

function ruFmt(n: number) {
  const s = Math.floor(Math.abs(n)).toString();
  const p: string[] = [];
  for (let i = s.length; i > 0; i -= 3) p.unshift(s.slice(Math.max(0, i - 3), i));
  return (n < 0 ? "−" : "") + p.join(" ");
}

export function RequestDrawer({ onClose, isCashGap, deficitAmount, onReschedule, canApprove = true, paymentAccKey = "acc1", cellDate, cellIncome, cellExpense, cellBalance, cellAccountName, isoDate }: RequestDrawerProps) {
  const { showToast } = useToast();

  const [tab, setTab] = useState<"payments" | "actions">("payments");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDatePick, setShowDatePick] = useState(false);
  const [newDate, setNewDate] = useState(cellDate || "");
  const [dateError, setDateError] = useState("");
  const [acting, setActing] = useState(false);

  const expense = cellExpense ?? 0;
  const income = cellIncome ?? 0;
  const balance = cellBalance ?? 0;

  // Загружаем платежи за выбранный день
  useEffect(() => {
    if (!isoDate) return;
    setLoading(true);
    api.payments.getAll({ date_from: isoDate, date_to: isoDate })
      .then(data => setPayments(data as PaymentRow[]))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [isoDate]);

  async function handleApprove() {
    if (!selectedPayment) return;
    setActing(true);
    try {
      await api.payments.approve(selectedPayment.id);
      setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: "approved" } : p));
      setSelectedPayment(null);
      showToast("Заявка согласована", "success");
    } catch { showToast("Ошибка согласования", "error"); }
    setActing(false);
  }

  async function handleRejectConfirm() {
    if (!selectedPayment || !rejectReason.trim()) return;
    setActing(true);
    try {
      await api.payments.reject(selectedPayment.id, rejectReason);
      setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: "rejected" } : p));
      setSelectedPayment(null); setShowReject(false); setRejectReason("");
      showToast("Заявка отклонена", "error");
    } catch { showToast("Ошибка отклонения", "error"); }
    setActing(false);
  }

  async function handleDateSave() {
    const err = dateRu(newDate);
    if (err) { setDateError(err); return; }
    setDateError("");
    if (selectedPayment) {
      setActing(true);
      try {
        await api.payments.move(selectedPayment.id, newDate);
        setPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
        onReschedule?.(cellDate || "", newDate, selectedPayment.amount, paymentAccKey);
        setSelectedPayment(null); setShowDatePick(false);
        showToast("Дата перенесена", "success");
      } catch { showToast("Ошибка переноса даты", "error"); }
      setActing(false);
    } else {
      onReschedule?.(cellDate || "", newDate, expense, paymentAccKey);
      setShowDatePick(false);
      showToast("Дата перенесена, остатки пересчитаны", "success");
    }
  }

  return (
    <div style={{
      position: "fixed", top: 56, right: 0, bottom: 0, width: 520,
      background: C.surface, borderLeft: `1px solid ${C.warm}`,
      boxShadow: "-2px 0 16px rgba(44,44,30,0.12)",
      display: "flex", flexDirection: "column",
      zIndex: 500, fontFamily: "Inter, sans-serif", overflowY: "auto",
    }}>

      {/* Cash-gap warning */}
      {isCashGap && (
        <div style={{ background: C.danger12, borderBottom: `2px solid ${C.danger}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <AlertTriangle size={16} color={C.danger} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.danger }}>
            Кассовый разрыв: −{ruFmt(Math.abs(deficitAmount || 0))} ₽
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}`, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>
            {cellAccountName || "Ячейка календаря"} · {cellDate || ""}
          </h2>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex", borderRadius: 6, marginTop: 2 }}>
          <X size={18} />
        </button>
      </div>

      {/* Summary */}
      <div style={{ padding: "14px 20px", display: "flex", gap: 24, borderBottom: `1px solid ${C.warm}`, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textLt }}>Приход</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.sage }}>↑ {ruFmt(income)} ₽</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.textLt }}>Расход</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.danger }}>↓ {ruFmt(expense)} ₽</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.textLt }}>Остаток</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: balance < 0 ? C.danger : C.textDk }}>= {ruFmt(balance)} ₽</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.warm}`, display: "flex", flexShrink: 0 }}>
        {(["payments", "actions"] as const).map(id => (
          <button key={id} onClick={() => { setTab(id); setSelectedPayment(null); setShowReject(false); setShowDatePick(false); }} style={{
            padding: "9px 16px", background: "none", border: "none",
            borderBottom: tab === id ? `2px solid ${C.sage}` : "2px solid transparent",
            marginBottom: -1, color: tab === id ? C.textDk : C.textLt,
            fontSize: 13, fontWeight: tab === id ? 600 : 400,
            cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>{id === "payments" ? "Платежи за день" : "Действия"}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>

        {tab === "payments" && (
          <>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: C.textLt, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Loader2 size={16} className="animate-spin" /> Загрузка…
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: C.textLt, fontSize: 13 }}>Нет платежей за этот день</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {payments.map(p => {
                  const badge = STATUS_BADGE[p.status] || C.badge.pending;
                  const isSelected = selectedPayment?.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setSelectedPayment(isSelected ? null : p)} style={{
                      padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                      border: isSelected ? `2px solid ${C.sage}` : `1px solid ${C.warm}`,
                      background: isSelected ? C.sage10 : C.surface,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.textDk }}>{ruFmt(p.amount)} ₽</span>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: badge.bg, color: badge.color }}>{STATUS_LABEL[p.status] || p.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.textLt, marginBottom: 3 }}>{p.counterparty} · {p.item}</div>
                      <div style={{ fontSize: 11, color: C.textLt }}>{p.purpose || "—"}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: C.textLt }}>Приоритет: {PRIORITY_LABEL[p.priority] || p.priority}</span>
                        <span style={{ fontSize: 11, color: C.textLt }}>Создал: {p.creator_name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "actions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!selectedPayment ? (
              <div style={{ padding: 24, textAlign: "center", color: C.textLt, fontSize: 13 }}>
                Выберите платёж на вкладке «Платежи за день»
              </div>
            ) : (
              <>
                <div style={{ background: C.ivory, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{ruFmt(selectedPayment.amount)} ₽ — {selectedPayment.counterparty}</div>
                  <div style={{ fontSize: 12, color: C.textLt, marginTop: 4 }}>{selectedPayment.item} · {selectedPayment.purpose || "—"}</div>
                </div>

                {selectedPayment.status === "pending" && canApprove && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={acting} onClick={handleApprove} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8,
                      background: C.sage, color: C.surface, border: "none",
                      fontSize: 13, fontWeight: 500, cursor: acting ? "wait" : "pointer", fontFamily: "Inter, sans-serif",
                    }}>{acting ? "…" : "Согласовать"}</button>
                    <button disabled={acting} onClick={() => setShowReject(true)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8,
                      background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}`,
                      fontSize: 13, fontWeight: 500, cursor: acting ? "wait" : "pointer", fontFamily: "Inter, sans-serif",
                    }}>Отклонить</button>
                  </div>
                )}

                {selectedPayment.status === "draft" && (
                  <div style={{ padding: "10px 14px", background: C.olive20, borderRadius: 6, fontSize: 12, color: C.olive }}>
                    Черновик — отправьте на согласование из списка заявок
                  </div>
                )}

                {selectedPayment.status === "approved" && (
                  <div style={{ padding: "10px 14px", background: C.sage10, borderRadius: 6, fontSize: 12, color: C.sage }}>
                    Заявка согласована
                  </div>
                )}

                {selectedPayment.status === "rejected" && (
                  <div style={{ padding: "10px 14px", background: C.danger08, borderRadius: 6, fontSize: 12, color: C.danger }}>
                    Заявка отклонена
                  </div>
                )}

                {onReschedule && (
                  <button onClick={() => { setShowDatePick(v => !v); setNewDate(cellDate || ""); }} style={{
                    padding: "10px 0", borderRadius: 8,
                    background: showDatePick ? C.hdr : C.ivory, color: C.textDk,
                    border: showDatePick ? `1.5px solid ${C.sage}` : `1.5px solid ${C.warm}`,
                    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <Calendar size={13} /> Перенести дату
                  </button>
                )}

                {showReject && (
                  <div style={{ background: C.danger08, border: `1.5px solid ${C.danger}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.danger }}>Причина отказа</div>
                    <textarea autoFocus placeholder="Укажите причину…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.danger}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", resize: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleRejectConfirm} disabled={!rejectReason.trim() || acting} style={{
                        flex: 1, padding: "8px 0", borderRadius: 6,
                        background: rejectReason.trim() ? C.danger : C.ivory,
                        color: C.surface, border: "none", fontSize: 13, fontWeight: 500,
                        cursor: rejectReason.trim() && !acting ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif",
                      }}><Check size={13} style={{ verticalAlign: -2 }} /> Подтвердить отказ</button>
                      <button onClick={() => { setShowReject(false); setRejectReason(""); }} style={{
                        padding: "8px 16px", borderRadius: 6, background: "transparent",
                        color: C.textLt, border: `1px solid ${C.warm}`, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif",
                      }}>Отмена</button>
                    </div>
                  </div>
                )}

                {showDatePick && (
                  <div style={{ background: C.ivory, border: `1.5px solid ${C.sage}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>Новая дата платежа</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="text" placeholder="дд.мм.гггг" value={newDate} onChange={e => { setNewDate(e.target.value); setDateError(""); }}
                        style={{ flex: 1, padding: "9px 12px", border: dateError ? `1.5px solid ${C.danger}` : `1.5px solid ${C.sage}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
                      <button disabled={acting} onClick={handleDateSave} style={{ padding: "9px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: acting ? "wait" : "pointer", fontFamily: "Inter, sans-serif" }}>Сохранить</button>
                    </div>
                    {dateError && <div style={{ fontSize: 11, color: C.danger }}>{dateError}</div>}
                    <button onClick={() => { setShowDatePick(false); setDateError(""); }} style={{ padding: "7px 10px", borderRadius: 6, background: "transparent", color: C.textLt, border: `1px solid ${C.warm}`, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", alignSelf: "flex-start" }}>Отмена</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
