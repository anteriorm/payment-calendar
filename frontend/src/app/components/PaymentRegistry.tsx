import { useState, useEffect } from "react";
import * as api from "../../api";
import { BarChart2, Plus, Search, X, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { exportCsv, kopecksToRub } from "../utils";

type Priority = "high" | "medium" | "low";

interface RegistryRow {
  id: number;
  counterparty: string;
  article: string;
  amount: number;
  account: string;
  date: string;
  priority: Priority;
  status: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  in_registry: { label: "В реестре", bg: C.badge.inRegistry.bg, color: C.badge.inRegistry.color },
  paid:        { label: "Оплачена",  bg: C.badge.paid.bg,       color: C.badge.paid.color },
  approved:    { label: "Согласована", bg: C.sage10,             color: "#3D6B3D" },
};

const PRIORITY_CFG: Record<Priority, { label: string; dot: string }> = {
  high:   { label: "Высокий", dot: C.danger },
  medium: { label: "Средний", dot: C.beige },
  low:    { label: "Низкий",  dot: C.sage },
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

export function PaymentRegistry({ onAddRequest, onPaymentsPaid, canMarkPaid = true }: {
  onAddRequest?: () => void;
  onPaymentsPaid?: (items: { dateStr: string; amount: number }[]) => void;
  canMarkPaid?: boolean;
}) {
  const { showToast } = useToast();
  const [registries, setRegistries] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hovered, setHovered] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadRegistries = () => {
    setLoading(true);
    api.registries.getAll()
      .then(data => { setRegistries(data); if (data.length > 0 && !currentId) setCurrentId(data[0].id); })
      .catch(() => showToast("Ошибка загрузки реестров", "error"))
      .finally(() => setLoading(false));
  };

  const loadRegistryDetail = (id: number) => {
    api.registries.getOne(id)
      .then(reg => {
        const mapped: RegistryRow[] = (reg.payments || []).map((p: any) => ({
          id: p.id,
          counterparty: p.counterparty?.name || "",
          article: p.item?.name || "",
          amount: kopecksToRub(p.amount || 0),
          account: p.account?.name || "",
          date: p.planned_date ? p.planned_date.split("-").reverse().join(".") : "",
          priority: p.priority || "medium",
          status: reg.status === "paid" ? "paid" : "in_registry",
        }));
        setRows(mapped);
      })
      .catch(() => showToast("Ошибка загрузки реестра", "error"));
  };

  useEffect(() => { loadRegistries(); }, []);
  useEffect(() => { if (currentId) loadRegistryDetail(currentId); else setRows([]); }, [currentId]);

  const toggleRow = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));

  const currentRegistry = registries.find(r => r.id === currentId);

  const markAsPaid = async () => {
    if (!currentId) return;
    try {
      await api.registries.pay(currentId);
      showToast(`Реестр №${currentId} оплачен`, "success");
      if (onPaymentsPaid) onPaymentsPaid(rows.filter(r => selected.has(r.id)).map(r => ({ dateStr: r.date, amount: r.amount })));
      setSelected(new Set());
      loadRegistries();
      loadRegistryDetail(currentId);
    } catch { showToast("Ошибка оплаты реестра", "error"); }
  };

  const handleExport = async () => {
    if (!currentId) return;
    try {
      const blob = await api.registries.export(currentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Реестр_${currentId}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      showToast(`Реестр №${currentId} скачан`, "success");
    } catch { showToast("Ошибка экспорта", "error"); }
  };

  const handleCreateRegistry = async (paymentIds: number[]) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await api.registries.create({ registry_date: today, payment_ids: paymentIds });
      showToast("Реестр создан", "success");
      loadRegistries();
      setShowAddModal(false);
    } catch (err: any) { showToast(err?.response?.data?.message || "Ошибка создания реестра", "error"); }
  };

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", minHeight: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textDk, margin: 0 }}>Реестр платежей</h1>
        <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center" }}>
          <select value={currentId || ""} onChange={e => { setCurrentId(Number(e.target.value) || null); setSelected(new Set()); }}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.warm}`, background: C.surface, fontSize: 13, color: C.textDk, fontFamily: "Inter, sans-serif" }}>
            <option value="">Выберите реестр</option>
            {registries.map(r => <option key={r.id} value={r.id}>Реестр №{r.id} ({r.registry_date}) — {r.status === "paid" ? "Оплачен" : "Создан"}</option>)}
          </select>
          <span style={{ fontSize: 14, color: C.textLt }}>
            {currentRegistry ? `Дата: ${currentRegistry.registry_date} · Статус: ${currentRegistry.status === "paid" ? "Оплачен" : "Создан"} · Заявок: ${rows.length}` : "Нет реестров"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <SummaryCard label="Итого к оплате" value={fmtShort(totalAmount)} valueColor={C.textDk} />
        <SummaryCard label="Заявок в реестре" value={String(rows.length)} valueColor={C.textDk} />
        <SummaryCard label="Статус" value={currentRegistry?.status === "paid" ? "Оплачен" : currentRegistry ? "Создан" : "—"} valueColor={currentRegistry?.status === "paid" ? C.sage : C.textDk} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: C.textLt }}>Выбрано: {selected.size} заявок</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExport} disabled={!currentId}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: currentId ? "pointer" : "default", fontFamily: "Inter, sans-serif" }}>
            <BarChart2 size={14} /> Выгрузить CSV
          </button>
          {canMarkPaid && currentRegistry?.status !== "paid" && (
            <button onClick={markAsPaid} disabled={rows.length === 0}
              style={{ padding: "7px 16px", borderRadius: 6, background: rows.length > 0 ? C.sage : C.ivory, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: rows.length > 0 ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif" }}>
              Отметить оплаченными
            </button>
          )}
          <button onClick={() => setShowAddModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <Plus size={14} /> Создать реестр
          </button>
        </div>
      </div>

      <div style={{ borderRadius: 8, border: `1px solid ${C.warm}`, overflow: "hidden", background: C.surface, boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.hdr }}>
            <th style={{ padding: "10px 14px", width: 36 }}><Checkbox checked={allSelected} onChange={toggleAll} /></th>
            {["№", "Контрагент", "Статья", "Сумма", "Счёт", "Приоритет", "Статус"].map(col => (
              <th key={col} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>{col}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: C.textLt }}>Загрузка...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: C.textLt }}>В реестре нет платежей</td></tr>}
            {!loading && rows.map((row, i) => {
              const isSel = selected.has(row.id);
              const sc = STATUS_CFG[row.status] ?? STATUS_CFG.in_registry;
              const pc = PRIORITY_CFG[row.priority] ?? PRIORITY_CFG.medium;
              return (
                <tr key={row.id} onClick={() => toggleRow(row.id)} onMouseEnter={() => setHovered(row.id)} onMouseLeave={() => setHovered(null)}
                  style={{ background: isSel ? C.selected : hovered === row.id ? C.beige30 : i % 2 === 0 ? C.surface : C.ivory50, transition: "background 0.1s", cursor: "pointer" }}>
                  <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}><Checkbox checked={isSel} onChange={() => toggleRow(row.id)} /></td>
                  <td style={{ padding: "10px 12px", color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{row.id}</td>
                  <td style={{ padding: "10px 12px", color: C.textDk, fontWeight: 500, whiteSpace: "nowrap" }}>{row.counterparty}</td>
                  <td style={{ padding: "10px 12px", color: C.textLt, whiteSpace: "nowrap" }}>{row.article}</td>
                  <td style={{ padding: "10px 12px", color: C.textDk, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtFull(row.amount)}</td>
                  <td style={{ padding: "10px 12px", color: C.textLt, whiteSpace: "nowrap" }}>{row.account}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: pc.dot, flexShrink: 0 }} />
                      <span style={{ color: C.textDk }}>{pc.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 500 }}>{sc.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.warm}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.ivory }}>
          <span style={{ fontSize: 12, color: C.textLt }}>Показано {rows.length} записей</span>
          <span style={{ fontSize: 12, color: C.textLt }}>Итого: <strong style={{ color: C.textDk }}>{fmtShort(totalAmount)}</strong></span>
        </div>
      </div>

      {showAddModal && <CreateRegistryModal onClose={() => setShowAddModal(false)} onCreate={handleCreateRegistry} />}
    </div>
  );
}

function SummaryCard({ label, value, valueColor, cardBg }: { label: string; value: string; valueColor: string; cardBg?: string }) {
  return (
    <div style={{ flex: 1, padding: "18px 20px", borderRadius: 8, background: cardBg ?? C.surface, border: `1px solid ${C.warm}`, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: C.textLt }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: valueColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{value}</span>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(); }}
      style={{ width: 16, height: 16, borderRadius: 3, border: checked ? "none" : `1.5px solid ${C.warm}`, background: checked ? C.sage : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#FAFAF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
  );
}

function CreateRegistryModal({ onClose, onCreate }: { onClose: () => void; onCreate: (ids: number[]) => void }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.payments.getAll({ status: "approved" })
      .then(data => setPayments(data.filter((p: any) => !p.registry_id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePick = (id: number) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = payments.filter(p =>
    !search || (p.counterparty || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, display: "flex", flexDirection: "column", boxShadow: "0 4px 24px rgba(44,44,30,0.18)", maxHeight: "80vh" }}>
        <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.textDk, margin: 0 }}>Создать реестр из согласованных заявок</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4 }}><X size={17} /></button>
        </div>
        <div style={{ height: 1, background: C.warm, flexShrink: 0 }} />
        <div style={{ padding: "12px 22px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}><Search size={14} /></div>
            <input autoFocus placeholder="Поиск по контрагенту…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 32px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 4px" }}>
          {loading && <div style={{ padding: 24, textAlign: "center", color: C.textLt }}>Загрузка...</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.textLt }}>Нет согласованных заявок</div>}
          {!loading && filtered.map((p: any) => {
            const isPicked = picked.has(p.id);
            return (
              <div key={p.id} onClick={() => togglePick(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 6, marginBottom: 4, background: isPicked ? C.beige30 : "transparent", border: `1px solid ${isPicked ? C.beige : C.warm}`, cursor: "pointer" }}>
                <Checkbox checked={isPicked} onChange={() => togglePick(p.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textDk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.counterparty}</div>
                  <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>{p.item} · {p.planned_date?.split("-").reverse().join(".")}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDk, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{p.amount} ₽</div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 22px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button disabled={picked.size === 0} onClick={() => onCreate([...picked])}
            style={{ padding: "8px 20px", borderRadius: 6, background: picked.size > 0 ? C.sage : C.warm, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: picked.size > 0 ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif" }}>
            Создать реестр{picked.size > 0 ? ` (${picked.size})` : ""}
          </button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
