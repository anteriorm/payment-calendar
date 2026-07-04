/**
 * RegistryDetailModal — детальная страница реестра платежей.
 *
 * STUB: данные берутся из api.registries.getOne(id).
 * Бэкенд должен реализовать GET /api/registries/{id}
 */

import { useState, useEffect } from "react";
import { X, Download, CheckCircle, XCircle } from "lucide-react";
import { C } from "../tokens";
import { useToast } from "./Toast";
import { exportCsv, formatAmount, getAccountCurrency } from "../utils";

interface RegistryRow {
  id:           number;
  counterparty: string;
  article:      string;
  amount:       number;
  account:      string;
  date:         string;
  priority:     "high" | "medium" | "low";
  status:       "registry" | "paid" | "no_funds";
}

interface RegistryDetail {
  id:            number;
  registry_date: string;
  status:        "draft" | "approved" | "paid" | "canceled";
  created_by:    string;
  approved_by?:  string;
  total_amount:  number;
  rows:          RegistryRow[];
}

// STUB mock data — replace with GET /api/registries/{id}
const MOCK_DETAIL: RegistryDetail = {
  id:            1,
  registry_date: "18.06.2026",
  status:        "paid",
  created_by:    "Петров И.А.",
  approved_by:   "Козлова Е.В.",
  total_amount:  1240000,
  rows: [
    { id: 2845, counterparty: "ООО Поставщик Альфа", article: "Аренда офиса",        amount: 420000, account: "Расчётный №1", date: "25.06.2026", priority: "high",   status: "paid" },
    { id: 2846, counterparty: "ИП Смирнов А.В.",     article: "Заработная плата",    amount: 560000, account: "Расчётный №1", date: "28.06.2026", priority: "high",   status: "paid" },
    { id: 2841, counterparty: "АО ТехСервис",        article: "Расходные материалы", amount: 187500, account: "Расчётный №2", date: "24.06.2026", priority: "low",    status: "paid" },
    { id: 2842, counterparty: "ООО РентаГрупп",      article: "Услуги подрядчиков",  amount: 95000,  account: "Касса",        date: "26.06.2026", priority: "medium", status: "paid" },
    { id: 2847, counterparty: "ПАО Энергоресурс",    article: "Налоги и сборы",      amount: 260000, account: "Расчётный №2", date: "27.06.2026", priority: "medium", status: "no_funds" },
  ],
};

// FIX #6: все цвета бейджей — через токены палитры (меняются при смене темы)
const STATUS_BADGE: Record<RegistryDetail["status"], { label: string; bg: string; color: string }> = {
  draft:    { label: "Черновик",  bg: C.badge.draft.bg,     color: C.badge.draft.color     },
  approved: { label: "Утверждён", bg: C.badge.approved.bg,  color: C.badge.approved.color  },
  paid:     { label: "Оплачен",   bg: C.badge.paid.bg,      color: C.badge.paid.color      },
  canceled: { label: "Отменён",   bg: C.badge.rejected.bg,  color: C.badge.rejected.color  },
};

const ROW_STATUS_BADGE: Record<RegistryRow["status"], { label: string; bg: string; color: string }> = {
  registry: { label: "В реестре",   bg: C.badge.inRegistry.bg, color: C.badge.inRegistry.color },
  paid:     { label: "Оплачена",    bg: C.badge.paid.bg,        color: C.badge.paid.color       },
  no_funds: { label: "Нет средств", bg: C.badge.rejected.bg,    color: C.badge.rejected.color   },
};

const PRIORITY_DOT: Record<RegistryRow["priority"], { dot: string; border?: boolean }> = {
  high:   { dot: C.danger              },
  medium: { dot: C.beige, border: true },
  low:    { dot: C.sage                },
};

function ruFmt(n: number, account = ""): string {
  return formatAmount(n, getAccountCurrency(account));
}

interface RegistryDetailModalProps {
  registryId: number;
  onClose:    () => void;
}

export function RegistryDetailModal({ registryId, onClose }: RegistryDetailModalProps) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<RegistryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    // STUB: api.registries.getOne(registryId).then(...)
    setTimeout(() => {
      setDetail({ ...MOCK_DETAIL, id: registryId });
      setLoading(false);
    }, 300);
  }, [registryId]);

  const handleExport = () => {
    if (!detail) return;
    exportCsv(
      `Реестр_${detail.registry_date}.csv`,
      ["№", "Контрагент", "Статья", "Сумма", "Счёт", "Дата", "Статус"],
      detail.rows.map(r => [r.id, r.counterparty, r.article, ruFmt(r.amount, r.account), r.account, r.date, ROW_STATUS_BADGE[r.status].label]),
    );
    showToast(`Реестр_${detail.registry_date}.csv скачан`, "success");
  };

  const sb = detail ? STATUS_BADGE[detail.status] : null;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 760, maxHeight: "88vh", background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: C.textDk, margin: 0 }}>
              Реестр № {registryId} · {detail?.registry_date ?? "…"}
            </h2>
            {sb && (
              <span style={{ padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 500, background: sb.bg, color: sb.color }}>
                {sb.label}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Meta */}
        {detail && (
          <div style={{ padding: "12px 24px", display: "flex", gap: 32, borderBottom: `1px solid ${C.warm}`, flexShrink: 0 }}>
            <MetaItem label="Создал" value={detail.created_by} />
            {detail.approved_by && <MetaItem label="Утвердил" value={detail.approved_by} />}
            <MetaItem label="Итого (RUB-экв.)" value={ruFmt(detail.total_amount)} bold />
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: C.textLt, fontSize: 13 }}>
              Загрузка реестра…
            </div>
          ) : (
            <div style={{ fontSize: 13, minWidth: 680 }}>

              {/* Шапка */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 120px 130px 120px 80px 70px 120px",
                background: C.ivory50,
                position: "sticky", top: 0,
                borderBottom: `1px solid ${C.warm}`,
              }}>
                {["№", "Контрагент", "Статья", "Сумма", "Счёт", "Дата", "Прит.", "Статус"].map(col => (
                  <div key={col} style={{
                    padding: "9px 10px", fontWeight: 600,
                    color: C.textDk, fontSize: 12, whiteSpace: "nowrap",
                  }}>
                    {col}
                  </div>
                ))}
              </div>

              {/* Строки */}
              {detail?.rows.map((row, i) => {
                const isHov = hovered === row.id;
                const rs = ROW_STATUS_BADGE[row.status];
                const pd = PRIORITY_DOT[row.priority];
                const bg = isHov ? C.beige30 : i % 2 === 0 ? C.surface : C.ivory50;
                return (
                  <div key={row.id}
                    onMouseEnter={() => setHovered(row.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "50px 1fr 120px 130px 120px 80px 70px 120px",
                      background: bg, transition: "background 0.1s",
                      borderBottom: `1px solid rgba(0,0,0,0.05)`,
                    }}>
                    <div style={{ padding: "9px 10px", color: C.textLt, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center" }}>{row.id}</div>
                    <div style={{ padding: "9px 10px", color: C.textDk, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>{row.counterparty}</div>
                    <div style={{ padding: "9px 10px", color: C.textLt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>{row.article}</div>
                    <div style={{ padding: "9px 10px", color: C.textDk, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>{ruFmt(row.amount, row.account)}</div>
                    <div style={{ padding: "9px 10px", color: C.textLt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>{row.account}</div>
                    <div style={{ padding: "9px 10px", color: C.textLt, whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>{row.date}</div>
                    <div style={{ padding: "9px 10px", display: "flex", alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: pd.dot, flexShrink: 0, border: pd.border ? `1px solid ${C.warm}` : undefined }} />
                    </div>
                    <div style={{ padding: "9px 10px", display: "flex", alignItems: "center" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: rs.bg, color: rs.color, whiteSpace: "nowrap" }}>
                        {rs.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Итого */}
              {detail && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 120px 130px 120px 80px 70px 120px",
                  background: C.ivory50,
                  borderTop: `2px solid ${C.warm}`,
                }}>
                  <div style={{ padding: "9px 10px", gridColumn: "1 / 4", fontWeight: 700, color: C.textDk, fontSize: 13, display: "flex", alignItems: "center" }}>
                    Итого: {detail.rows.length} заявок
                  </div>
                  <div style={{ padding: "9px 10px", fontWeight: 700, color: C.textDk, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", flexDirection: "column", gap: 2 }}>
                    <span>{ruFmt(detail.total_amount)}</span>
                    <span style={{ fontSize: 10, color: C.textLt, fontWeight: 400 }}>RUB-экв.</span>
                  </div>
                  <div style={{ gridColumn: "5 / 9" }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10, flexShrink: 0 }}>
          {detail?.status === "approved" && (
            <button
              onClick={() => { showToast("Реестр оплачен — статус обновлён", "success"); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              <CheckCircle size={14} />
              Оплатить реестр
            </button>
          )}
          {detail?.status === "draft" && (
            <button
              onClick={() => { showToast("Реестр утверждён", "success"); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 6, background: C.olive, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              <CheckCircle size={14} />
              Утвердить реестр
            </button>
          )}
          <button onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <Download size={14} />
            Экспорт CSV
          </button>
          <button onClick={onClose}
            style={{ padding: "9px 14px", borderRadius: 6, background: "transparent", color: C.textLt, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textLt, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: bold ? C.textDk : C.textDk, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
