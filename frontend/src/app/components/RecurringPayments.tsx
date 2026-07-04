import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { RefreshCw, Pause, Play, Trash2, Plus, ChevronDown, Search, FilePlus, AlertCircle, Edit2 } from "lucide-react";
import { C } from "../tokens";
import { useToast } from "./Toast";
import { TableSkeleton, TableError } from "./TableSkeleton";
import * as api from "../../api";
import type { RecurringTemplate, RecurringFrequency } from "../../api";
import { getAccountCurrency, formatAmount } from "../utils";

type RecurringStatus = "active" | "paused" | "completed";

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  daily:     "Ежедневно",
  weekly:    "Еженедельно",
  monthly:   "Ежемесячно",
  quarterly: "Ежеквартально",
  yearly:    "Ежегодно",
};

const FREQ_COLOR: Record<RecurringFrequency, { bg: string; color: string }> = {
  daily:     { bg: C.danger12, color: C.danger    },
  weekly:    { bg: C.beige30,  color: "#7A5A30"   },
  monthly:   { bg: C.sage10,   color: "#3D6B3D"   },
  quarterly: { bg: C.olive20,  color: "#555540"   },
  yearly:    { bg: C.ivory,    color: C.textLt    },
};

const STATUS_CFG: Record<RecurringStatus, { label: string; bg: string; color: string }> = {
  active:    { label: "Активен",  bg: C.sage10,  color: "#3D6B3D" },
  paused:    { label: "Пауза",    bg: C.beige30, color: "#7A5A30" },
  completed: { label: "Завершён", bg: C.ivory,   color: C.textLt  },
};

const PRIORITY_DOT: Record<string, string> = { high: C.danger, medium: C.beige, low: C.sage };

// #   Название     Статья  Счёт  Сумма  Частота  Следующий  Статус  Действия
const COLS = "36px minmax(130px,1fr) 98px 78px 92px 98px 112px 80px 158px";

const ACCOUNTS       = ["Расчётный №1", "Расчётный №2", "Касса"];
const ARTICLES       = ["Аренда офиса", "Заработная плата", "Расходные материалы", "Услуги подрядчиков", "Налоги и сборы", "Аренда"];
const COUNTERPARTIES = ["ООО РентаГрупп", "ИП Смирнов А.В.", "АО ТехСервис", "ООО Поставщик Альфа", "ПАО Энергоресурс", "ООО ТехСервис", "Выплаты сотрудникам"];
const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly",    label: "Еженедельно"    },
  { value: "monthly",   label: "Ежемесячно"     },
  { value: "quarterly", label: "Ежеквартально"  },
  { value: "yearly",    label: "Ежегодно"       },
];

interface TemplateForm {
  name: string; counterparty: string; article: string; account: string;
  amount: string; frequency: RecurringFrequency;
  start_date: string; end_date: string;
  purpose: string; priority: "high" | "medium" | "low";
}

const EMPTY_FORM: TemplateForm = {
  name: "", counterparty: "", article: "", account: "", amount: "",
  frequency: "monthly", start_date: "2026-07-01", end_date: "", purpose: "", priority: "medium",
};

function templateToForm(t: RecurringTemplate): TemplateForm {
  return {
    name:         t.name,
    counterparty: t.counterparty,
    article:      t.article,
    account:      t.account,
    amount:       String(Math.floor(t.amount / 100)),
    frequency:    t.frequency,
    start_date:   t.start_date,
    end_date:     t.end_date ?? "",
    purpose:      t.purpose,
    priority:     t.priority,
  };
}

function ruFmt(n: number): string {
  const s = Math.floor(Math.abs(n / 100)).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ");
}

function fmtTemplateAmount(kopecks: number, account: string): string {
  return formatAmount(Math.floor(Math.abs(kopecks) / 100), getAccountCurrency(account));
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function daysUntil(isoDate: string): number {
  const today = new Date("2026-07-02");
  return Math.round((new Date(isoDate).getTime() - today.getTime()) / 86400000);
}

interface RecurringPaymentsProps {
  /** Может создавать и редактировать шаблоны — Инициатор, Администратор */
  canCreate?:  boolean;
  /** Может запускать платёж из шаблона, ставить на паузу — Инициатор, Казначей, Администратор */
  canOperate?: boolean;
}

export function RecurringPayments({ canCreate = false, canOperate = false }: RecurringPaymentsProps) {
  const { showToast } = useToast();
  const [rows,        setRows]        = useState<RecurringTemplate[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [freqFilter,  setFreqFilter]  = useState<RecurringFrequency | "">("");

  // Modal state: null = closed, "create" = new, RecurringTemplate = edit
  const [formModal,   setFormModal]   = useState<null | "create" | RecurringTemplate>(null);
  const [form,        setForm]        = useState<TemplateForm>(EMPTY_FORM);
  const [formErr,     setFormErr]     = useState<Partial<TemplateForm>>({});

  // Delete confirm modal
  const [delTarget,   setDelTarget]   = useState<RecurringTemplate | null>(null);

  useEffect(() => {
    setLoading(true);
    api.recurring.getAll()
      .then(data => { setRows(data as RecurringTemplate[]); setLoading(false); })
      .catch(() => { setError("Не удалось загрузить шаблоны"); setLoading(false); });
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErr({});
    setFormModal("create");
  }

  function openEdit(t: RecurringTemplate) {
    setForm(templateToForm(t));
    setFormErr({});
    setFormModal(t);
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.name.toLowerCase().includes(q) && !r.counterparty.toLowerCase().includes(q)) return false;
    if (freqFilter && r.frequency !== freqFilter) return false;
    return true;
  });

  async function handlePauseResume(id: number, status: RecurringStatus) {
    try {
      if (status === "active") {
        await api.recurring.pause(id);
        setRows(rs => rs.map(r => r.id === id ? { ...r, status: "paused" } : r));
        showToast("Шаблон приостановлен", "warning");
      } else {
        await api.recurring.resume(id);
        setRows(rs => rs.map(r => r.id === id ? { ...r, status: "active" } : r));
        showToast("Шаблон возобновлён", "success");
      }
    } catch { showToast("Ошибка при изменении статуса", "error"); }
  }

  async function handleDeleteConfirm() {
    if (!delTarget) return;
    try {
      await api.recurring.delete(delTarget.id);
      setRows(rs => rs.filter(r => r.id !== delTarget.id));
      setDelTarget(null);
      showToast("Шаблон удалён", "success");
    } catch { showToast("Ошибка при удалении", "error"); }
  }

  async function handleGenerate(id: number) {
    try {
      await api.recurring.generate(id);
      setRows(rs => rs.map(r => r.id === id ? { ...r, last_created: r.next_date, created_count: r.created_count + 1 } : r));
      showToast("Черновик платежа создан — откройте «Заявки на платёж»", "success");
    } catch { showToast("Ошибка при создании платежа", "error"); }
  }

  function validateForm(): boolean {
    const e: Partial<TemplateForm> = {};
    if (!form.name.trim())         e.name         = "Укажите название";
    if (!form.counterparty.trim()) e.counterparty  = "Укажите контрагента";
    if (!form.article)             e.article       = "Выберите статью";
    if (!form.account)             e.account       = "Выберите счёт";
    const n = parseFloat(form.amount.replace(/[^\d,.]/g, "").replace(",", "."));
    if (!form.amount || isNaN(n) || n <= 0) e.amount = "Сумма должна быть > 0";
    if (!form.start_date.match(/^\d{4}-\d{2}-\d{2}$/)) e.start_date = "Формат: гггг-мм-дд";
    setFormErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleFormSubmit() {
    if (!validateForm()) return;
    const amountKop = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    const payload = {
      name: form.name.trim(), counterparty: form.counterparty.trim(),
      article: form.article, account: form.account, amount: amountKop,
      frequency: form.frequency, start_date: form.start_date,
      end_date: form.end_date || undefined,
      purpose: form.purpose.trim(), priority: form.priority,
    };
    try {
      if (formModal === "create") {
        const created = await api.recurring.create(payload);
        setRows(rs => [...rs, created as RecurringTemplate]);
        showToast("Шаблон создан", "success");
      } else {
        const t = formModal as RecurringTemplate;
        await api.recurring.update(t.id, payload);
        setRows(rs => rs.map(r => r.id === t.id ? { ...r, ...payload } : r));
        showToast("Шаблон обновлён", "success");
      }
      setFormModal(null);
    } catch { showToast("Ошибка при сохранении", "error"); }
  }

  const isEditMode = formModal !== null && formModal !== "create";

  const hdrCell: CSSProperties = {
    padding: "10px 12px", fontSize: 12, fontWeight: 600,
    color: C.textLt, background: C.hdr, whiteSpace: "nowrap",
  };
  const cell: CSSProperties = {
    padding: "10px 12px", fontSize: 13, color: C.textDk, display: "flex", alignItems: "center",
  };
  const inputBase: CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 6,
    border: `1px solid ${C.warm}`, background: C.surface,
    fontSize: 13, color: C.textDk, outline: "none",
    fontFamily: "Inter, sans-serif", boxSizing: "border-box",
  };
  const selBase: CSSProperties = { ...inputBase, appearance: "none", cursor: "pointer" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>

      {/* ── Toolbar ── */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.warm}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}>
            <Search size={15} />
          </div>
          <input type="text" placeholder="Поиск по названию, контрагенту…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputBase, paddingLeft: 34 }} />
        </div>

        <div style={{ position: "relative" }}>
          <select value={freqFilter} onChange={e => setFreqFilter(e.target.value as RecurringFrequency | "")}
            style={{ ...selBase, width: 160, paddingRight: 28 }}>
            <option value="">Все частоты</option>
            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
            <ChevronDown size={13} />
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div style={{ padding: "6px 14px", borderRadius: 6, background: C.sage10, border: `1px solid ${C.sage}`, fontSize: 12, color: "#3D6B3D", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} />
            <span>{rows.filter(r => r.status === "active").length} активных</span>
          </div>
          {canCreate && (
            <button onClick={openCreate}
              style={{ padding: "7px 14px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} />
              Новый шаблон
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <TableSkeleton rows={5} cols={COLS} />
        ) : error ? (
          <TableError message={error} onRetry={() => { setError(null); setLoading(true); api.recurring.getAll().then(d => { setRows(d as RecurringTemplate[]); setLoading(false); }).catch(() => { setError("Ошибка загрузки"); setLoading(false); }); }} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: COLS, borderBottom: `2px solid ${C.warm}`, position: "sticky", top: 0, zIndex: 2 }}>
              {["#", "Название / Контрагент", "Статья", "Счёт", "Сумма", "Частота", "Следующий платёж", "Статус", "Действия"].map(col => (
                <div key={col} style={hdrCell}>{col}</div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", color: C.textLt, fontSize: 14 }}>
                Шаблоны не найдены
              </div>
            ) : (
              filtered.map((r, i) => {
                const bg = i % 2 === 0 ? C.surface : C.ivory50;
                const freq = FREQ_COLOR[r.frequency];
                const st = STATUS_CFG[r.status as RecurringStatus];
                const days = daysUntil(r.next_date);
                const nextColor = days <= 3 ? C.danger : days <= 7 ? "#7A5A30" : C.textDk;
                const isActive = r.status === "active";
                return (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: COLS, borderBottom: `1px solid ${C.ivory}`, background: bg }}>

                    <div style={{ ...cell, color: C.textLt, fontSize: 12 }}>{r.id}</div>

                    <div style={{ ...cell, flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 0, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_DOT[r.priority], flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: C.textDk, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: C.textLt, paddingLeft: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{r.counterparty}</span>
                    </div>

                    <div style={{ ...cell, fontSize: 12, color: C.textLt }}>{r.article}</div>
                    <div style={{ ...cell, fontSize: 12, color: C.textLt }}>{r.account}</div>

                    <div style={{ ...cell, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: C.textDk }}>
                      {fmtTemplateAmount(r.amount, r.account)}
                    </div>

                    <div style={cell}>
                      <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, background: freq.bg, color: freq.color }}>
                        {FREQ_LABEL[r.frequency]}
                      </span>
                    </div>

                    <div style={{ ...cell, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: nextColor }}>{formatDate(r.next_date)}</span>
                      {days >= 0 && (
                        <span style={{ fontSize: 10, color: days <= 3 ? C.danger : C.textLt }}>
                          {days === 0 ? "Сегодня" : `через ${days} д.`}
                        </span>
                      )}
                      {r.last_created && (
                        <span style={{ fontSize: 10, color: C.textLt }}>
                          Пред.: {formatDate(r.last_created)} ({r.created_count}×)
                        </span>
                      )}
                    </div>

                    <div style={cell}>
                      <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ ...cell, gap: 4 }}>
                      {/* Создать платёж из шаблона (canOperate) */}
                      {canOperate && isActive && (
                        <ActionBtn title="Создать черновик платежа" bg={C.sage10} border={C.sage} color="#3D6B3D" onClick={() => handleGenerate(r.id)}>
                          <FilePlus size={13} />
                        </ActionBtn>
                      )}

                      {/* Пауза / Возобновить (canOperate) */}
                      {canOperate && r.status !== "completed" && (
                        <ActionBtn title={isActive ? "Приостановить" : "Возобновить"}
                          bg={isActive ? C.beige30 : C.sage10}
                          border={isActive ? "#C0A070" : C.sage}
                          color={isActive ? "#7A5A30" : "#3D6B3D"}
                          onClick={() => handlePauseResume(r.id, r.status as RecurringStatus)}>
                          {isActive ? <Pause size={13} /> : <Play size={13} />}
                        </ActionBtn>
                      )}

                      {/* Редактировать (canCreate only) */}
                      {canCreate && (
                        <ActionBtn title="Редактировать шаблон" bg={C.ivory} border={C.warm} color={C.olive} onClick={() => openEdit(r)}>
                          <Edit2 size={13} />
                        </ActionBtn>
                      )}

                      {/* Удалить (canCreate only) */}
                      {canCreate && (
                        <ActionBtn title="Удалить шаблон" bg={C.danger08} border={C.danger} color={C.danger} onClick={() => setDelTarget(r)}>
                          <Trash2 size={13} />
                        </ActionBtn>
                      )}

                      {!canOperate && !canCreate && (
                        <span style={{ fontSize: 11, color: C.textLt }}>Просмотр</span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.warm}`, fontSize: 12, color: C.textLt, flexShrink: 0, display: "flex", alignItems: "center", gap: 16 }}>
        <span>Шаблонов: {filtered.length}</span>
        {filtered.some(r => daysUntil(r.next_date) <= 3 && r.status === "active") && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.danger }}>
            <AlertCircle size={13} />
            Есть шаблоны с платежом в ближайшие 3 дня
          </span>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {formModal !== null && (
        <div onClick={() => setFormModal(null)}
          style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 680, maxHeight: "92vh", background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, display: "flex", flexDirection: "column", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>

            <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: `1px solid ${C.warm}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>
                {isEditMode ? `Редактировать шаблон: ${(formModal as RecurringTemplate).name}` : "Новый шаблон повторяющегося платежа"}
              </h2>
              <button onClick={() => setFormModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex", borderRadius: 4 }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>

              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Название шаблона" error={formErr.name}>
                  <input style={{ ...inputBase, borderColor: formErr.name ? C.danger : C.warm }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Напр.: Аренда офиса" />
                </FormField>
              </div>

              <FormField label="Контрагент" error={formErr.counterparty}>
                <SelectW value={form.counterparty} onChange={v => setForm(f => ({ ...f, counterparty: v }))} placeholder="Выберите контрагента" options={COUNTERPARTIES.map(c => ({ value: c, label: c }))} base={selBase} err={!!formErr.counterparty} />
              </FormField>

              <FormField label="Статья расходов" error={formErr.article}>
                <SelectW value={form.article} onChange={v => setForm(f => ({ ...f, article: v }))} placeholder="Выберите статью" options={ARTICLES.map(a => ({ value: a, label: a }))} base={selBase} err={!!formErr.article} />
              </FormField>

              <FormField label="Счёт" error={formErr.account}>
                <SelectW value={form.account} onChange={v => setForm(f => ({ ...f, account: v }))} placeholder="Выберите счёт" options={ACCOUNTS.map(a => ({ value: a, label: a }))} base={selBase} err={!!formErr.account} />
              </FormField>

              <FormField label="Сумма (₽)" error={formErr.amount}>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputBase, paddingRight: 28, borderColor: formErr.amount ? C.danger : C.warm }} type="text" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.textLt, pointerEvents: "none" }}>₽</span>
                </div>
              </FormField>

              <FormField label="Частота">
                <SelectW value={form.frequency} onChange={v => setForm(f => ({ ...f, frequency: v as RecurringFrequency }))} options={FREQ_OPTIONS} base={selBase} />
              </FormField>

              <FormField label="Дата начала (гггг-мм-дд)" error={formErr.start_date}>
                <input style={{ ...inputBase, borderColor: formErr.start_date ? C.danger : C.warm }} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} placeholder="2026-07-01" />
              </FormField>

              <FormField label="Дата окончания (необязательно)">
                <input style={inputBase} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} placeholder="2026-12-31" />
              </FormField>

              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Назначение платежа">
                  <input style={inputBase} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Необязательно" />
                </FormField>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Приоритет">
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["high", "medium", "low"] as const).map(p => {
                      const labels = { high: "Высокий", medium: "Средний", low: "Низкий" };
                      const sel = form.priority === p;
                      const accent = PRIORITY_DOT[p];
                      const bg = p === "high" ? C.danger08 : p === "medium" ? "rgba(224,192,160,0.22)" : C.sage10;
                      return (
                        <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 6, border: sel ? `2px solid ${accent}` : `1px solid ${C.warm}`, background: sel ? bg : C.surface, fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? accent : C.textLt, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                          {labels[p]}
                        </button>
                      );
                    })}
                  </div>
                </FormField>
              </div>

            </div>

            <div style={{ borderTop: `1px solid ${C.warm}`, padding: "16px 24px", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={handleFormSubmit}
                style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                {isEditMode ? "Сохранить изменения" : "Создать шаблон"}
              </button>
              <button onClick={() => setFormModal(null)}
                style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.warm}`, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {delTarget && (
        <div onClick={() => setDelTarget(null)}
          style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 420, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, padding: "28px 28px 20px", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: "0 0 8px" }}>
              Удалить шаблон?
            </h3>
            <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 6px", lineHeight: 1.5 }}>
              <strong style={{ color: C.textDk }}>{delTarget.name}</strong>
            </p>
            <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 24px", lineHeight: 1.5 }}>
              Это действие нельзя отменить. Ранее созданные из шаблона заявки останутся.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeleteConfirm}
                style={{ padding: "9px 20px", borderRadius: 6, background: C.danger, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                Удалить
              </button>
              <button onClick={() => setDelTarget(null)}
                style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.warm}`, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Sub-components ── */

function ActionBtn({ title, bg, border, color, onClick, children }: {
  title: string; bg: string; border: string; color: string; onClick: () => void; children: ReactNode;
}) {
  return (
    <button title={title} onClick={onClick}
      style={{ padding: "5px 7px", borderRadius: 5, background: bg, border: `1px solid ${border}`, cursor: "pointer", display: "flex", color, flexShrink: 0 }}>
      {children}
    </button>
  );
}

function SelectW({ value, onChange, placeholder, options, base, err }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  options: { value: string; label: string }[];
  base: CSSProperties; err?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...base, paddingRight: 28, borderColor: err ? C.danger : undefined }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt }} />
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: C.danger, marginTop: 3, display: "block" }}>{error}</span>}
    </div>
  );
}
