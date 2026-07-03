import { useState, useEffect } from "react";
import { TableSkeleton, TableError } from "./TableSkeleton";
import { RegistryDetailModal } from "./RegistryDetailModal";
import * as api from "../../api";
import { BarChart2, Plus, Pencil, Trash2, Search, X, ExternalLink } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv, kopecksToRub, rubToKopecks, formatRubFromRub } from "../utils";

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

interface PaidItem { dateStr: string; amount: number; }

function mapApiRegistryToRows(registry: any): RegistryRow[] {
  if (!registry.payments || !registry.payments.length) return [];
  return registry.payments.map((p: any) => ({
    id: p.id,
    counterparty: p.counterparty?.name || '',
    article: p.item?.name || '',
    amount: kopecksToRub(p.amount || 0),
    account: p.account?.name || '',
    date: p.planned_date ? p.planned_date.split('-').reverse().join('.') : '',
    priority: p.priority || 'medium',
    status: registry.status === 'paid' ? 'paid' : 'registry',
  }));
}

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
  const [registries,   setRegistries]  = useState<any[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [loadError,    setLoadError]   = useState<string | null>(null);
  const [selected,     setSelected]    = useState<Set<number>>(new Set());
  const [hovered,      setHovered]     = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailRegistryId, setDetailRegistryId] = useState<number | null>(null);
  const [editTarget,   setEditTarget]  = useState<RegistryRow | null>(null);
  const [delTarget,    setDelTarget]   = useState<RegistryRow | null>(null);
  const [currentRegistryId, setCurrentRegistryId] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    api.registries.getAll()
      .then(data => {
        console.log('📦 Получены реестры:', data);
        setRegistries(data);
        // Объединяем платежи из всех реестров в одну таблицу
        const allRows: RegistryRow[] = [];
        data.forEach((reg: any) => {
          if (reg.payments && reg.payments.length) {
            const mapped = mapApiRegistryToRows(reg);
            allRows.push(...mapped);
            // Запоминаем registry_id для каждого платежа (для удаления)
            mapped.forEach(row => {
              // Не храним, но при удалении будем использовать registry_id
            });
          }
        });
        setRows(allRows);
        // Если есть реестры, берём первый как текущий для добавления (можно выбрать)
        if (data.length > 0) setCurrentRegistryId(data[0].id);
        else setCurrentRegistryId(null);
      })
      .catch((err) => {
        console.error('Ошибка загрузки реестров:', err);
        setLoadError("Не удалось загрузить реестры");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const toggleRow   = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSelected  = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));

  const selCount = selected.size;

  const markAsPaid = async () => {
    if (selCount === 0 || !currentRegistryId) return;
    try {
      await api.registries.pay(currentRegistryId);
      showToast(`Реестр №${currentRegistryId} отмечен оплаченным`, "success");
      if (onPaymentsPaid) {
        const paidItems = rows.filter(r => selected.has(r.id)).map(r => ({ dateStr: r.date, amount: r.amount }));
        onPaymentsPaid(paidItems);
      }
      setSelected(new Set());
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Ошибка при оплате реестра', 'error');
    }
  };

  const handleExcel = async () => {
    if (!currentRegistryId) {
      showToast('Нет реестра для экспорта', 'warning');
      return;
    }
    try {
      const blob = await api.registries.export(currentRegistryId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Реестр_${currentRegistryId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast(`Реестр №${currentRegistryId} скачан`, "success");
    } catch (err) {
      console.error(err);
      showToast('Ошибка экспорта', 'error');
    }
  };

  const handleAddFromModal = async (ids: number[]) => {
    if (!currentRegistryId) {
      showToast('Нет активного реестра', 'error');
      return;
    }
    try {
      // Обновляем каждый платёж, добавляя registry_id
      for (const id of ids) {
        await api.payments.update(id, { registry_id: currentRegistryId });
      }
      showToast(`${ids.length} заявок добавлено в реестр`, "success");
      loadData();
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      showToast('Ошибка добавления заявок', 'error');
    }
  };

  const handleDeleteFromRegistry = async (row: RegistryRow) => {
    try {
      // Удаляем связь с реестром (registry_id = null)
      await api.payments.update(row.id, { registry_id: null });
      showToast(`Заявка №${row.id} удалена из реестра`, "success");
      setDelTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Ошибка удаления', 'error');
    }
  };

  const handleEditStatus = async (id: number, status: RowStatus) => {
    try {
      // статус реестра меняем только через оплату всего реестра, но если нужно изменить отдельный платёж,
      // можно изменить статус платежа (но тогда он выйдет из реестра). Мы не будем это поддерживать.
      // Вместо этого для демонстрации показываем, что статус можно изменить только через оплату всего реестра.
      showToast('Изменить статус отдельной заявки можно только через оплату реестра', 'warning');
    } catch (err) {
      console.error(err);
    }
  };

  const selectedRegistry = registries.find(r => r.id === currentRegistryId);

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", minHeight: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textDk, margin: 0 }}>Реестр платежей</h1>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <select
            value={currentRegistryId || ''}
            onChange={(e) => setCurrentRegistryId(Number(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.warm}`, background: C.surface }}
          >
            <option value="">Выберите реестр</option>
            {registries.map(r => (
              <option key={r.id} value={r.id}>
                Реестр №{r.id} ({r.registry_date}) — {r.status}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 14, color: C.textLt }}>
            {selectedRegistry ? `Дата: ${selectedRegistry.registry_date} · Статус: ${selectedRegistry.status === 'paid' ? 'Оплачен' : 'Создан'}` : 'Нет реестров'}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <SummaryCard label="Итого к оплате" value={rows.reduce((s, r) => s + (r.status === 'registry' ? r.amount : 0), 0) + " ₽"} valueColor={C.textDk} />
        <SummaryCard label="Доступный остаток" value="980 000,00 ₽" valueColor={C.sage} />
        <SummaryCard label="Дефицит" value="−260 000,00 ₽" valueColor={C.danger} cardBg={C.danger08} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: C.textLt }}>
          Выбрано: {selected.size} заявок
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setDetailRegistryId(currentRegistryId)}
            disabled={!currentRegistryId}
            style={{ padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: currentRegistryId ? "pointer" : "default", fontFamily: "Inter, sans-serif" }}
          >
            <ExternalLink size={14} /> Открыть реестр
          </button>
          <button
            onClick={handleExcel}
            disabled={!currentRegistryId}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: currentRegistryId ? "pointer" : "default", fontFamily: "Inter, sans-serif" }}
          >
            <BarChart2 size={14} /> Выгрузить в Excel
          </button>
          <button
            onClick={markAsPaid}
            disabled={selCount === 0 || !canMarkPaid || !currentRegistryId}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              background: selCount > 0 && canMarkPaid && currentRegistryId ? C.sage : C.ivory,
              color: C.surface,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: selCount > 0 && canMarkPaid && currentRegistryId ? "pointer" : "not-allowed",
              fontFamily: "Inter, sans-serif",
              transition: "background 0.2s",
              opacity: selCount === 0 ? 0.65 : 1,
            }}
          >
            Отметить оплаченными{selCount > 0 ? ` (${selCount})` : ""}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!currentRegistryId}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: currentRegistryId ? "pointer" : "default", fontFamily: "Inter, sans-serif" }}
          >
            <Plus size={14} /> Добавить заявку
          </button>
        </div>
      </div>

      <div style={{ borderRadius: 8, border: `1px solid ${C.warm}`, overflow: "hidden", background: C.surface, boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.hdr }}>
              <th style={{ padding: "10px 14px", width: 36 }}>
                <Checkbox checked={allSelected} indeterminate={selected.size > 0 && selected.size < rows.length} onChange={toggleAll} />
              </th>
              {["№", "Контрагент", "Статья", "Сумма", "Счёт", "Приоритет", "Статус", "Действия"].map(col => (
                <th key={col} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skel-${i}`} style={{ background: i % 2 === 0 ? C.surface : C.ivory50 }}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} style={{ padding: "10px 12px" }}>
                    <div style={{ height: 12, borderRadius: 4, background: `linear-gradient(90deg, ${C.ivory} 25%, ${C.warm} 50%, ${C.ivory} 75%)`, backgroundSize: "200% 100%", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && loadError && (
              <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#8B2020", fontSize: 13 }}>{loadError} — <button onClick={loadData} style={{ background: "none", border: "none", cursor: "pointer", color: C.sage, textDecoration: "underline", fontFamily: "Inter, sans-serif", fontSize: 13 }}>Повторить</button></td></tr>
            )}
            {!loading && !loadError && rows.map((row, i) => {
              const isSel = selected.has(row.id);
              const isHov = hovered === row.id;
              const bg = isSel ? C.selected : isHov ? C.beige30 : (i % 2 === 0 ? C.surface : C.ivory50);
              const sc = STATUS_CFG[row.status];
              const pc = PRIORITY_CFG[row.priority];
              return (
                <tr key={row.id} onClick={() => toggleRow(row.id)} onMouseEnter={() => setHovered(row.id)} onMouseLeave={() => setHovered(null)}
                  style={{ background: bg, transition: "background 0.1s", cursor: "pointer" }}>
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
              <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: C.textLt, fontSize: 13 }}>В реестре нет платежей</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.warm}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.ivory }}>
          <span style={{ fontSize: 12, color: C.textLt }}>Показано {rows.length} из {rows.length} записей</span>
          <span style={{ fontSize: 12, color: C.textLt }}>
            Итого: <strong style={{ color: C.textDk }}>{rows.reduce((s, r) => s + r.amount, 0)} ₽</strong>
          </span>
        </div>
      </div>

      {showAddModal && currentRegistryId && (
        <AddToRegistryModal
          registryId={currentRegistryId}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddFromModal}
        />
      )}

      {editTarget && (
        <RegistryEditModal
          row={editTarget}
          onSave={handleEditStatus}
          onClose={() => setEditTarget(null)}
        />
      )}

      {delTarget && (
        <RegistryConfirmDelete
          row={delTarget}
          onConfirm={() => handleDeleteFromRegistry(delTarget)}
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

// ---- Sub-components ----

function SummaryCard({ label, value, valueColor, cardBg }: any) {
  return (
    <div style={{ flex: 1, padding: "18px 20px", borderRadius: 8, background: cardBg ?? C.surface, border: `1px solid ${C.warm}`, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: C.textLt }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: valueColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{value}</span>
    </div>
  );
}

function Checkbox({ checked, indeterminate, onChange }: any) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(); }} style={{ width: 16, height: 16, borderRadius: 3, border: checked || indeterminate ? "none" : `1.5px solid ${C.warm}`, background: checked ? C.sage : indeterminate ? C.olive : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#FAFAF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: C.surface, borderRadius: 1 }} />}
    </div>
  );
}

function ActionIcons({ onEdit, onDelete }: any) {
  const [hovEdit, setHovEdit] = useState(false);
  const [hovDel, setHovDel] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onEdit} onMouseEnter={() => setHovEdit(true)} onMouseLeave={() => setHovEdit(false)} style={{ background: "none", border: "none", cursor: "pointer", color: hovEdit ? C.sage : C.olive, padding: 2, display: "flex", transition: "color 0.15s" }}><Pencil size={14} /></button>
      <button onClick={onDelete} onMouseEnter={() => setHovDel(true)} onMouseLeave={() => setHovDel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: hovDel ? C.danger : C.olive, padding: 2, display: "flex", transition: "color 0.15s" }}><Trash2 size={14} /></button>
    </div>
  );
}

function AddToRegistryModal({ registryId, onClose, onAdd }: any) {
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.payments.getAll({ status: 'approved' })
      .then(data => {
        // Фильтруем те, у которых registry_id === null
        const filtered = data.filter((p: any) => p.registry_id === null);
        setAvailablePayments(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [registryId]);

  const togglePick = (id: number) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = availablePayments.filter(p =>
    !search || (p.counterparty?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, display: "flex", flexDirection: "column", boxShadow: "0 4px 24px rgba(44,44,30,0.18)", maxHeight: "80vh" }}>
        <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.textDk, margin: 0 }}>Добавить заявки в реестр</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, borderRadius: 4 }}><X size={17} /></button>
        </div>
        <div style={{ height: 1, background: C.warm, flexShrink: 0 }} />
        <div style={{ padding: "12px 22px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}><Search size={14} /></div>
            <input autoFocus placeholder="Поиск по контрагенту…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "8px 10px 8px 32px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 4px" }}>
          {loading && <div style={{ padding: "24px 0", textAlign: "center", color: C.textLt, fontSize: 13 }}>Загрузка доступных платежей…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: "24px 0", textAlign: "center", color: C.textLt, fontSize: 13 }}>Нет доступных заявок для добавления</div>}
          {!loading && filtered.map((p: any) => {
            const isPicked = picked.has(p.id);
            return (
              <div key={p.id} onClick={() => togglePick(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 6, marginBottom: 4, background: isPicked ? C.beige30 : "transparent", border: `1px solid ${isPicked ? C.beige : C.warm}`, cursor: "pointer", transition: "background 0.1s, border-color 0.1s" }}>
                <Checkbox checked={isPicked} onChange={() => togglePick(p.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textDk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.counterparty?.name || ''}</div>
                  <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>{p.item?.name || ''} · {p.planned_date?.split('-').reverse().join('.') || ''}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmtShort(kopecksToRub(p.amount || 0))}</div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 22px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button disabled={picked.size === 0} onClick={() => onAdd([...picked])} style={{ padding: "8px 20px", borderRadius: 6, background: picked.size > 0 ? C.sage : C.warm, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: picked.size > 0 ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", transition: "background 0.15s" }}>Добавить{picked.size > 0 ? ` (${picked.size})` : ""}</button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function RegistryEditModal({ row, onSave, onClose }: any) {
  const [status, setStatus] = useState<RowStatus>(row.status);
  const STATUS_OPTIONS: { value: RowStatus; label: string }[] = [
    { value: "registry", label: "В реестре" },
    { value: "paid",     label: "Оплачена" },
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
              <button key={opt.value} onClick={() => setStatus(opt.value)} style={{ padding: "9px 14px", borderRadius: 6, border: status === opt.value ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: status === opt.value ? C.sage10 : C.surface, color: status === opt.value ? C.sage : C.textDk, fontSize: 13, fontWeight: status === opt.value ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left" }}>
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

function RegistryConfirmDelete({ row, onConfirm, onCancel }: any) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, padding: "28px 28px 20px", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: "0 0 8px" }}>Удалить из реестра?</h3>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 6px", lineHeight: 1.5 }}><strong style={{ color: C.textDk }}>{row.counterparty}</strong></p>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 24px" }}>Заявка № {row.id} будет убрана из текущего реестра.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 6, background: C.danger, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Удалить</button>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.warm}`, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}