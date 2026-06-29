import { useState, useEffect } from "react";
import { TableSkeleton, TableError } from "./TableSkeleton";
import { RegistryDetailModal } from "./RegistryDetailModal";
import * as api from "../../api";
import { BarChart2, Plus, Pencil, Trash2, Search, X, ExternalLink } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv } from "../utils";

type Priority = "high" | "medium" | "low";
type RowStatus = "registry" | "paid" | "no_funds";

interface RegistryRow {
  id:           number;
  counterparty: string;
  article:      string;
  amount:       number;
  account:      string;
  date:         string;
  priority:     Priority;
  status:       RowStatus;
}

const INITIAL_ROWS: RegistryRow[] = [
  { id: 2845, counterparty: "ООО Поставщик Альфа", article: "Аренда офиса",        amount: 420000, account: "Расчётный счёт №1", date: "25.06.2026", priority: "high",   status: "registry" },
  { id: 2846, counterparty: "ИП Смирнов А.В.",     article: "Заработная плата",    amount: 560000, account: "Расчётный счёт №1", date: "28.06.2026", priority: "high",   status: "registry" },
  { id: 2841, counterparty: "АО ТехСервис",        article: "Расходные материалы", amount: 187500, account: "Расчётный счёт №2", date: "24.06.2026", priority: "low",    status: "paid"     },
  { id: 2842, counterparty: "ООО РентаГрупп",      article: "Услуги подрядчиков",  amount: 95000,  account: "Касса",             date: "26.06.2026", priority: "medium", status: "paid"     },
  { id: 2847, counterparty: "ПАО Энергоресурс",    article: "Налоги и сборы",      amount: 260000, account: "Расчётный счёт №2", date: "27.06.2026", priority: "medium", status: "no_funds" },
];

interface AvailableRequest {
  id:           number;
  counterparty: string;
  article:      string;
  amount:       number;
  date:         string;
  priority:     Priority;
}

const AVAILABLE: AvailableRequest[] = [
  { id: 2843, counterparty: "ООО ТехСервис",       article: "Услуги подрядчиков", amount: 85000,  date: "20.06.2026", priority: "medium" },
  { id: 2844, counterparty: "ИП Смирнов А.В.",     article: "Аренда",             amount: 45000,  date: "22.06.2026", priority: "high"   },
  { id: 2848, counterparty: "ПАО Энергоресурс",    article: "Консалтинг",         amount: 95000,  date: "15.06.2026", priority: "medium" },
  { id: 2850, counterparty: "ООО Альфа-Строй",     article: "Аренда офиса",       amount: 120000, date: "30.06.2026", priority: "low"    },
  { id: 2851, counterparty: "ЗАО МедиаГрупп",      article: "Реклама",            amount: 38000,  date: "28.06.2026", priority: "low"    },
];

function fmtFull(n: number): string {
  const s = Math.floor(Math.abs(n)).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return (n < 0 ? "−" : "") + parts.join(" ") + ",00 ₽";
}

function fmtShort(n: number): string {
  const s = Math.floor(n).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ") + " ₽";
}

const STATUS_CFG: Record<RowStatus, { label: string; bg: string; color: string }> = {
  registry: { label: "В реестре",   bg: C.badge.inRegistry.bg, color: C.badge.inRegistry.color },
  paid:     { label: "Оплачена",    bg: C.badge.paid.bg,        color: C.badge.paid.color       },
  no_funds: { label: "Нет средств", bg: C.danger15,             color: "#8B2020"                 },
};

const PRIORITY_CFG: Record<Priority, { label: string; dot: string; border?: boolean }> = {
  high:   { label: "Высокий", dot: C.danger                  },
  medium: { label: "Средний", dot: C.beige,  border: true    },
  low:    { label: "Низкий",  dot: C.sage                    },
};

interface PaidItem { dateStr: string; amount: number; }

export function PaymentRegistry({
  onAddRequest: _onAddRequest,
  onPaymentsPaid,
  canMarkPaid = true,
}: {
  onAddRequest?: () => void;
  onPaymentsPaid?: (items: PaidItem[]) => void;
  canMarkPaid?: boolean;
}) {
  const { showToast } = useToast();

  const [rows,         setRows]        = useState<RegistryRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  const loadData = () => {
    setLoading(true); setLoadError(null);
    // STUB: api.registries.getAll() → replace with real API
    // Using INITIAL_ROWS mock via setTimeout to simulate API
    setTimeout(() => { setRows(INITIAL_ROWS.map(r => ({...r}))); setLoading(false); }, 300);
  };
  useEffect(() => { loadData(); }, []);
  const [selected,     setSelected]    = useState<Set<number>>(new Set());
  const [hovered,      setHovered]     = useState<number | null>(null);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [detailRegistryId, setDetailRegistryId] = useState<number | null>(null);
  const [editTarget,   setEditTarget]  = useState<RegistryRow | null>(null);
  const [delTarget,    setDelTarget]   = useState<RegistryRow | null>(null);

  const allSelected  = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selCount     = selected.size;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));

  const toggleRow = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const markAsPaid = () => {
    if (selCount === 0) return;
    const paidRows = rows.filter(r => selected.has(r.id) && r.status !== "paid");
    setRows(prev => prev.map(r => selected.has(r.id) ? { ...r, status: "paid" as RowStatus } : r));
    const n = selCount;
    setSelected(new Set());
    if (paidRows.length > 0) {
      onPaymentsPaid?.(paidRows.map(r => ({ dateStr: r.date, amount: r.amount })));
    }
    showToast(
      `${n} заявк${n === 1 ? "а отмечена" : n < 5 ? "и отмечены" : " отмечено"} оплаченными`,
      "success",
    );
  };

  const handleExcel = () => {
    const toExport = selected.size > 0
      ? rows.filter(r => selected.has(r.id))
      : rows;
    exportCsv(
      "Реестр_18.06.2026.csv",
      ["№", "Контрагент", "Статья", "Сумма", "Счёт", "Приоритет", "Статус"],
      toExport.map(r => [
        r.id,
        r.counterparty,
        r.article,
        fmtShort(r.amount),
        r.account,
        PRIORITY_CFG[r.priority].label,
        STATUS_CFG[r.status].label,
      ]),
    );
    showToast(`Реестр_18.06.2026.csv скачан (${toExport.length} строк)`, "success");
  };

  const handleAddFromModal = (ids: number[]) => {
    const newRows: RegistryRow[] = AVAILABLE
      .filter(r => ids.includes(r.id))
      .map(r => ({
        id:           r.id,
        counterparty: r.counterparty,
        article:      r.article,
        amount:       r.amount,
        account:      "Расчётный счёт №1",
        priority:     r.priority,
        status:       "registry" as RowStatus,
      }));
    setRows(prev => [...prev, ...newRows]);
    showToast(`${newRows.length} заявок добавлено в реестр`, "success");
    setShowAddModal(false);
  };

  const selLabel = selCount === 0
    ? "Выбрано: 0 заявок"
    : `Выбрано: ${selCount} заявк${selCount === 1 ? "а" : selCount < 5 ? "и" : ""}`;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", minHeight: "100%", overflowY: "auto" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textDk, margin: 0 }}>Реестр платежей</h1>
        <span style={{ fontSize: 14, color: C.textLt }}>18 июня 2026</span>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <SummaryCard label="Итого к оплате"    value="1 240 000,00 ₽" valueColor={C.textDk}  />
        <SummaryCard label="Доступный остаток" value="980 000,00 ₽"   valueColor={C.sage}    />
        <SummaryCard label="Дефицит"           value="−260 000,00 ₽"  valueColor={C.danger}  cardBg={C.danger08} />
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: C.textLt, transition: "color 0.15s" }}>{selLabel}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <BtnOutline onClick={() => setDetailRegistryId(1)} icon={<ExternalLink size={14} />}>
            Открыть реестр
          </BtnOutline>
          <BtnOutline onClick={handleExcel} icon={<BarChart2 size={14} />}>
            Выгрузить в Excel
          </BtnOutline>

          <button
            onClick={markAsPaid}
            disabled={selCount === 0 || !canMarkPaid}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              background: selCount > 0 && canMarkPaid ? C.sage : C.ivory,
              color: C.surface,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: selCount > 0 ? "pointer" : "not-allowed",
              fontFamily: "Inter, sans-serif",
              transition: "background 0.2s",
              opacity: selCount === 0 ? 0.65 : 1,
            }}
          >
            Отметить оплаченными{selCount > 0 ? ` (${selCount})` : ""}
          </button>

          {canMarkPaid && (
            <BtnOutline onClick={() => setShowAddModal(true)} icon={<Plus size={14} />}>
              Добавить заявку
            </BtnOutline>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          borderRadius: 8,
          border: `1px solid ${C.warm}`,
          overflow: "hidden",
          background: C.surface,
          boxShadow: "0 1px 3px rgba(44,44,30,0.08)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.hdr }}>
              <th style={{ padding: "10px 14px", width: 36 }}>
                <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
              </th>
              {["№", "Контрагент", "Статья", "Сумма", "Счёт", "Приоритет", "Статус", "Действия"].map(col => (
                <th key={col} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Loading skeleton — правильные <tr> внутри <tbody> */}
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skel-${i}`} style={{ background: i % 2 === 0 ? C.surface : C.ivory50 }}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} style={{ padding: "10px 12px" }}>
                    <div style={{ height: 12, borderRadius: 4, background: `linear-gradient(90deg, ${C.ivory} 25%, ${C.warm} 50%, ${C.ivory} 75%)`, backgroundSize: "200% 100%", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Error state */}
            {!loading && loadError && (
              <tr>
                <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#8B2020", fontSize: 13 }}>
                  {loadError} — <button onClick={loadData} style={{ background: "none", border: "none", cursor: "pointer", color: C.sage, textDecoration: "underline", fontFamily: "Inter, sans-serif", fontSize: 13 }}>Повторить</button>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading && !loadError && rows.map((row, i) => {
              const isSel = selected.has(row.id);
              const isHov = hovered === row.id;
              const even  = i % 2 === 0;

              const bg = isSel
                ? C.selected
                : isHov ? C.beige30
                : even ? C.surface : C.ivory50;

              const sc = STATUS_CFG[row.status];
              const pc = PRIORITY_CFG[row.priority];

              return (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  onMouseEnter={() => setHovered(row.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ background: bg, transition: "background 0.1s", cursor: "pointer" }}
                >
                  <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSel} onChange={() => toggleRow(row.id)} />
                  </td>
                  <td style={{ padding: "10px 12px", color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{row.id}</td>
                  <td style={{ padding: "10px 12px", color: C.textDk, fontWeight: 500, whiteSpace: "nowrap" }}>{row.counterparty}</td>
                  <td style={{ padding: "10px 12px", color: C.textLt, whiteSpace: "nowrap" }}>{row.article}</td>
                  <td style={{ padding: "10px 12px", color: C.textDk, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtFull(row.amount)}</td>
                  <td style={{ padding: "10px 12px", color: C.textLt, whiteSpace: "nowrap" }}>{row.account}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: pc.dot, flexShrink: 0, border: pc.border ? "1px solid #C0A070" : undefined }} />
                      <span style={{ color: C.textDk }}>{pc.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 500 }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                    <ActionIcons onEdit={() => setEditTarget(row)} onDelete={() => setDelTarget(row)} />
                  </td>
                </tr>
              );
            })}

            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: C.textLt, fontSize: 13 }}>Реестр пуст</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.warm}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.ivory }}>
          <span style={{ fontSize: 12, color: C.textLt }}>Показано {rows.length} из {rows.length} записей</span>
          <span style={{ fontSize: 12, color: C.textLt }}>
            Итого: <strong style={{ color: C.textDk }}>1 240 000,00 ₽</strong>
          </span>
        </div>
      </div>

      {/* ── Add to registry modal ── */}
      {showAddModal && (
        <AddToRegistryModal
          available={AVAILABLE.filter(r => !rows.find(row => row.id === r.id))}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddFromModal}
          fmtShort={fmtShort}
        />
      )}

      {/* ── Edit row modal ── */}
      {editTarget && (
        <RegistryEditModal
          row={editTarget}
          onSave={(id, status) => {
            setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            showToast("Статус обновлён", "success");
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Delete confirm ── */}
      {delTarget && (
        <RegistryConfirmDelete
          row={delTarget}
          onConfirm={() => {
            setRows(prev => prev.filter(r => r.id !== delTarget.id));
            showToast(`Заявка № ${delTarget.id} удалена из реестра`, "error");
            setDelTarget(null);
          }}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {detailRegistryId !== null && (
        <RegistryDetailModal
          registryId={detailRegistryId}
          onClose={() => setDetailRegistryId(null)}
        />
      )}
    </div>
  );
}

/* ── Add-to-registry modal ──────────────────────────── */

function AddToRegistryModal({
  available,
  onClose,
  onAdd,
  fmtShort,
}: {
  available: AvailableRequest[];
  onClose: () => void;
  onAdd: (ids: number[]) => void;
  fmtShort: (n: number) => string;
}) {
  const [search,  setSearch]  = useState("");
  const [picked,  setPicked]  = useState<Set<number>>(new Set());

  const filtered = available.filter(r =>
    !search ||
    r.counterparty.toLowerCase().includes(search.toLowerCase()) ||
    r.article.toLowerCase().includes(search.toLowerCase()),
  );

  const togglePick = (id: number) =>
    setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const pc = picked.size;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 560, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, display: "flex", flexDirection: "column", boxShadow: "0 4px 24px rgba(44,44,30,0.18)", maxHeight: "80vh" }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.textDk, margin: 0 }}>
            Добавить заявки в реестр
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex", padding: 4, borderRadius: 4 }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ height: 1, background: C.warm, flexShrink: 0 }} />

        {/* Search */}
        <div style={{ padding: "12px 22px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}>
              <Search size={14} />
            </div>
            <input
              autoFocus
              placeholder="Поиск по контрагенту или статье…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 32px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Request list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 4px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: C.textLt, fontSize: 13 }}>
              Нет доступных заявок
            </div>
          )}
          {filtered.map(r => {
            const isPicked = picked.has(r.id);
            const pc_cfg = ({ high: { dot: C.danger }, medium: { dot: C.beige, border: true }, low: { dot: C.sage } } as const)[r.priority];
            return (
              <div
                key={r.id}
                onClick={() => togglePick(r.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  borderRadius: 6,
                  marginBottom: 4,
                  background: isPicked ? C.beige30 : "transparent",
                  border: `1px solid ${isPicked ? C.beige : C.warm}`,
                  cursor: "pointer",
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                <Checkbox checked={isPicked} onChange={() => togglePick(r.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textDk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.counterparty}
                  </div>
                  <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>
                    {r.article} · {r.date}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: pc_cfg.dot, border: "border" in pc_cfg ? "1px solid #C0A070" : undefined }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {fmtShort(r.amount)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 22px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => pc > 0 && onAdd([...picked])}
            disabled={pc === 0}
            style={{ padding: "8px 20px", borderRadius: 6, background: pc > 0 ? C.sage : C.warm, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: pc > 0 ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", transition: "background 0.15s" }}
          >
            Добавить{pc > 0 ? ` (${pc})` : ""}
          </button>
          <button
            onClick={onClose}
            style={{ padding: "8px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────── */

function SummaryCard({ label, value, valueColor, cardBg }: { label: string; value: string; valueColor: string; cardBg?: string }) {
  return (
    <div style={{ flex: 1, padding: "18px 20px", borderRadius: 8, background: cardBg ?? C.surface, border: `1px solid ${C.warm}`, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: C.textLt }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: valueColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{value}</span>
    </div>
  );
}

function BtnOutline({ children, onClick, icon }: { children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
      {icon}
      {children}
    </button>
  );
}

function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{ width: 16, height: 16, borderRadius: 3, border: checked || indeterminate ? "none" : `1.5px solid ${C.warm}`, background: checked ? C.sage : indeterminate ? C.olive : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="#FAFAF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: C.surface, borderRadius: 1 }} />}
    </div>
  );
}

function ActionIcons({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const [hovEdit, setHovEdit] = useState(false);
  const [hovDel,  setHovDel]  = useState(false);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onEdit} onMouseEnter={() => setHovEdit(true)} onMouseLeave={() => setHovEdit(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: hovEdit ? C.sage : C.olive, padding: 2, display: "flex", transition: "color 0.15s" }}>
        <Pencil size={14} />
      </button>
      <button onClick={onDelete} onMouseEnter={() => setHovDel(true)} onMouseLeave={() => setHovDel(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: hovDel ? C.danger : C.olive, padding: 2, display: "flex", transition: "color 0.15s" }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ── Registry edit modal ──────────────────────────── */
function RegistryEditModal({ row, onSave, onClose }: {
  row: RegistryRow;
  onSave: (id: number, status: RowStatus) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<RowStatus>(row.status);
  const STATUS_OPTIONS: { value: RowStatus; label: string }[] = [
    { value: "registry", label: "В реестре"   },
    { value: "paid",     label: "Оплачена"    },
    { value: "no_funds", label: "Нет средств" },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>Заявка № {row.id}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex" }}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px" }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 8 }}>Изменить статус</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setStatus(opt.value)}
                style={{ padding: "9px 14px", borderRadius: 6, border: status === opt.value ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: status === opt.value ? C.sage10 : C.surface, color: status === opt.value ? C.sage : C.textDk, fontSize: 13, fontWeight: status === opt.value ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left" }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={() => onSave(row.id, status)} style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Сохранить</button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Registry delete confirm ──────────────────────── */
function RegistryConfirmDelete({ row, onConfirm, onCancel }: {
  row: RegistryRow; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, padding: "28px 28px 20px", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: "0 0 8px" }}>Удалить из реестра?</h3>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 6px", lineHeight: 1.5 }}>
          <strong style={{ color: C.textDk }}>{row.counterparty}</strong>
        </p>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 24px" }}>Заявка № {row.id} будет убрана из текущего реестра.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 6, background: C.danger, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Удалить</button>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.warm}`, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
