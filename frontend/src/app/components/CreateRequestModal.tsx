import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { X, Calendar, Search, ChevronDown, GitBranch } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";
import { rubToKopecks, getAccountCurrency, getCurrencySymbol } from "../utils";
import * as api from "../../api";
import type { ApprovalRoute } from "../../api";

export interface ModalRequestData {
  id?:           number;
  amount?:       string;
  date?:         string;
  routeId?:      number;
  account?:      string;
  counterparty?: string;
  article?:      string;
  purpose?:      string;
  priority?:     Priority;
  recurring?:    boolean;
  frequency?:    Frequency;
  endDate?:      string;
}

interface CreateRequestModalProps {
  onClose:      () => void;
  initialData?: ModalRequestData;
  onSave?:      (data: ModalRequestData, asDraft: boolean) => void;
}

type Priority  = "high" | "medium" | "low";
type Frequency = "monthly" | "weekly" | "quarterly";

const PRIORITIES: { value: Priority; label: string; dot: string; accent: string; bg: string }[] = [
  { value: "high",   label: "Высокий", dot: C.danger, accent: C.danger,  bg: C.danger08              },
  { value: "medium", label: "Средний", dot: C.beige,  accent: "#7A5A30", bg: "rgba(224,192,160,0.22)" },
  { value: "low",    label: "Низкий",  dot: C.sage,   accent: C.sage,    bg: C.sage10                 },
];

const ACCOUNTS_DEFAULT = [
  { value: "Расчётный №1", label: "Расчётный счёт №1 (RUB)" },
  { value: "Расчётный №2", label: "Расчётный счёт №2 (USD)" },
  { value: "Касса",        label: "Касса (RUB)"              },
];

const ARTICLES_DEFAULT = [
  { value: "Аренда офиса",        label: "Аренда офиса"          },
  { value: "Заработная плата",     label: "Заработная плата"       },
  { value: "Расходные материалы",  label: "Расходные материалы"    },
  { value: "Услуги подрядчиков",   label: "Услуги подрядчиков"     },
  { value: "Налоги и сборы",       label: "Налоги и сборы"         },
];

const COUNTERPARTIES_DEFAULT = [
  "ООО Поставщик Альфа",
  "ИП Смирнов А.В.",
  "АО ТехСервис",
  "ООО РентаГрупп",
  "ПАО Энергоресурс",
];

export function CreateRequestModal({ onClose, initialData, onSave }: CreateRequestModalProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(initialData?.id);

  const [amount,       setAmount]       = useState(initialData?.amount       ?? "");
  const [date,         setDate]         = useState(initialData?.date         ?? "26.06.2026");
  const [account,      setAccount]      = useState(initialData?.account      ?? "");
  const [counterparty, setCounterparty] = useState(initialData?.counterparty ?? "");
  const [cpOpen,       setCpOpen]       = useState(false);
  const [article,      setArticle]      = useState(initialData?.article      ?? "");
  const [purpose,      setPurpose]      = useState(initialData?.purpose      ?? "");
  const [priority,     setPriority]     = useState<Priority>(initialData?.priority ?? "medium");
  const [recurring,    setRecurring]    = useState(false);
  const [frequency,    setFrequency]    = useState<Frequency>("monthly");
  const [endDate,      setEndDate]      = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [routes,       setRoutes]       = useState<ApprovalRoute[]>([]);
  const [selectedRoute,setSelectedRoute]= useState<number>(1);
  const [accounts,     setAccounts]     = useState<{value: string; label: string}[]>(ACCOUNTS_DEFAULT);
  const [articles,     setArticles]     = useState<{value: string; label: string}[]>(ARTICLES_DEFAULT);
  const [counterparties, setCounterparties] = useState<string[]>(COUNTERPARTIES_DEFAULT);

  useEffect(() => {
    api.accounts.getAll()
      .then(data => setAccounts((data as any[]).map(a => ({ value: a.name, label: `${a.name} (${a.currency})` }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.items.getAll()
      .then(data => setArticles((data as any[]).map(i => ({ value: i.name, label: i.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.counterparties.getAll()
      .then(data => setCounterparties((data as any[]).map(c => c.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.approvals.getRoutes().then(r => {
      const rs = r as ApprovalRoute[];
      setRoutes(rs);
      if (rs.length) setSelectedRoute(rs[0].id);
    });
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const num = parseFloat(amount.replace(/[^\d,.]/g, "").replace(",", "."));
    if (!amount || isNaN(num) || num <= 0)
      e.amount = "Укажите сумму больше 0";
    if (!date.match(/^\d{2}\.\d{2}\.\d{4}$/))
      e.date = "Формат: дд.мм.гггг";
    if (!account)
      e.account = "Выберите счёт";
    if (!counterparty.trim())
      e.counterparty = "Укажите контрагента";
    if (!article)
      e.article = "Выберите статью расходов";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const focusStyle = (name: string): CSSProperties => {
    if (errors[name]) return { border: `1.5px solid ${C.danger}`, boxShadow: `0 0 0 3px rgba(192,80,74,0.15)` };
    if (focusedField === name) return { border: `1.5px solid ${C.sage}`, boxShadow: `0 0 0 3px ${C.sage20}` };
    return { border: `1px solid ${C.warm}` };
  };

  const baseInput: CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    background: C.surface,
    fontSize: 14,
    color: C.textDk,
    outline: "none",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
    transition: "border 0.15s, box-shadow 0.15s",
  };

  const filteredCp = counterparty
    ? counterparties.filter(c => c.toLowerCase().includes(counterparty.toLowerCase()))
    : counterparties;

  const title = isEdit ? `Редактировать заявку № ${initialData!.id}` : "Новая заявка на платёж";
  const submitLabel = isEdit ? "Сохранить изменения" : "Отправить на согласование";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 600, maxHeight: "92vh", background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, display: "flex", flexDirection: "column", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex", borderRadius: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ height: 1, background: C.warm, flexShrink: 0 }} />

        {/* ── Form body ── */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>

          {/* Сумма */}
          <div>
            {/* STUB: перед отправкой на реальный API конвертировать rubToKopecks(amount)
                  Пользователь вводит сумму в валюте счёта, API принимает в минимальных единицах */}
            <FieldLabel>Сумма ({getAccountCurrency(account) || "RUB"})</FieldLabel>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                onFocus={() => setFocusedField("amount")} onBlur={() => setFocusedField(null)}
                style={{ ...baseInput, ...focusStyle("amount"), paddingRight: 36 }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLt, pointerEvents: "none" }}>
                {getCurrencySymbol(getAccountCurrency(account) || "RUB")}
              </span>
            </div>
            {errors.amount && <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{errors.amount}</span>}
          </div>

          {/* Дата платежа */}
          <div>
            <FieldLabel>Дата платежа</FieldLabel>
            <div style={{ position: "relative" }}>
              <input type="text" value={date} onChange={e => setDate(e.target.value)}
                onFocus={() => setFocusedField("date")} onBlur={() => setFocusedField(null)}
                style={{ ...baseInput, ...focusStyle("date"), paddingRight: 36 }} />
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.olive, pointerEvents: "none", display: "flex" }}>
                <Calendar size={15} />
              </div>
            </div>
            {errors.date && <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{errors.date}</span>}
          </div>

          {/* Счёт */}
          <div>
            <FieldLabel>Счёт</FieldLabel>
            <SelectField value={account} onChange={setAccount} placeholder="Выберите счёт" options={accounts}
              focusStyle={focusStyle("account")} baseInput={baseInput}
              onFocus={() => setFocusedField("account")} onBlur={() => setFocusedField(null)} />
            {errors.account && <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{errors.account}</span>}
          </div>

          {/* Контрагент */}
          <div style={{ position: "relative" }}>
            <FieldLabel>Контрагент</FieldLabel>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}>
                <Search size={15} />
              </div>
              <input type="text" placeholder="Поиск контрагента…" value={counterparty}
                onChange={e => { setCounterparty(e.target.value); setCpOpen(true); }}
                onFocus={() => { setFocusedField("cp"); setCpOpen(true); }}
                onBlur={() => { setFocusedField(null); setTimeout(() => setCpOpen(false), 150); }}
                style={{ ...baseInput, ...focusStyle("cp"), paddingLeft: 34 }} />
            </div>
            {errors.counterparty && <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{errors.counterparty}</span>}
            {cpOpen && filteredCp.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 6, boxShadow: "0 4px 12px rgba(44,44,30,0.12)", zIndex: 10, marginTop: 2, overflow: "hidden" }}>
                {filteredCp.map(cp => (
                  <div key={cp} onMouseDown={() => { setCounterparty(cp); setCpOpen(false); }}
                    style={{ padding: "9px 14px", fontSize: 13, color: C.textDk, cursor: "pointer", borderBottom: `1px solid ${C.ivory}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.beige30)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    {cp}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Статья расходов */}
          <div>
            <FieldLabel>Статья расходов</FieldLabel>
            <SelectField value={article} onChange={setArticle} placeholder="Выберите статью" options={articles}
              focusStyle={focusStyle("article")} baseInput={baseInput}
              onFocus={() => setFocusedField("article")} onBlur={() => setFocusedField(null)} />
          </div>

          {/* Назначение платежа */}
          <div>
            <FieldLabel>Назначение платежа</FieldLabel>
            <textarea placeholder="Укажите назначение платежа" value={purpose}
              onChange={e => setPurpose(e.target.value)}
              onFocus={() => setFocusedField("purpose")} onBlur={() => setFocusedField(null)}
              rows={3}
              style={{ ...baseInput, ...focusStyle("purpose"), resize: "vertical", minHeight: 80 }} />
          </div>

          {/* Приоритет */}
          <div>
            <FieldLabel>Приоритет</FieldLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITIES.map(p => {
                const sel = priority === p.value;
                return (
                  <button key={p.value} onClick={() => setPriority(p.value)}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 6, border: sel ? `2px solid ${p.accent}` : `1px solid ${C.warm}`, background: sel ? p.bg : C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? p.accent : C.textLt, transition: "all 0.15s" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.dot, flexShrink: 0, border: p.value === "medium" ? "1px solid #C0A070" : undefined }} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Маршрут согласования */}
          {!isEdit && routes.length > 0 && (
            <div>
              <FieldLabel>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <GitBranch size={12} color={C.sage} />
                  Маршрут согласования
                </span>
              </FieldLabel>
              <div style={{ display: "flex", gap: 8 }}>
                {routes.map(r => {
                  const sel = selectedRoute === r.id;
                  return (
                    <button key={r.id} onClick={() => setSelectedRoute(r.id)}
                      style={{
                        flex: 1, padding: "9px 8px", borderRadius: 6,
                        border: sel ? `2px solid ${C.sage}` : `1px solid ${C.warm}`,
                        background: sel ? C.sage10 : C.surface,
                        color: sel ? "#3D6B3D" : C.textLt,
                        fontSize: 12, fontWeight: sel ? 600 : 400,
                        cursor: "pointer", fontFamily: "Inter, sans-serif",
                        transition: "all 0.15s", textAlign: "left",
                        display: "flex", flexDirection: "column", gap: 2,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontSize: 11, opacity: 0.85 }}>{r.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Повторяющийся платёж */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Toggle checked={recurring} onChange={() => setRecurring(v => !v)} />
              <span style={{ fontSize: 14, color: C.textDk }}>Повторять автоматически</span>
            </div>

            {recurring && (
              <div style={{ marginTop: 14, padding: 16, background: C.ivory50, borderRadius: 8, border: `1px solid ${C.warm}`, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <FieldLabel>Частота</FieldLabel>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([
                      { value: "monthly",   label: "Ежемесячно"   },
                      { value: "weekly",    label: "Еженедельно"  },
                      { value: "quarterly", label: "Ежеквартально"},
                    ] as { value: Frequency; label: string }[]).map(f => {
                      const active = frequency === f.value;
                      return (
                        <button key={f.value} onClick={() => setFrequency(f.value)}
                          style={{ flex: 1, padding: "7px 8px", borderRadius: 6, border: "none", background: active ? C.sage : C.ivory, color: active ? C.surface : C.textLt, fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "background 0.15s" }}>
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <FieldLabel>Дата окончания</FieldLabel>
                  <div style={{ position: "relative" }}>
                    <input type="text" placeholder="31.12.2026" value={endDate} onChange={e => setEndDate(e.target.value)}
                      onFocus={() => setFocusedField("endDate")} onBlur={() => setFocusedField(null)}
                      style={{ ...baseInput, ...focusStyle("endDate"), paddingRight: 36 }} />
                    <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.olive, pointerEvents: "none", display: "flex" }}>
                      <Calendar size={15} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => {
              if (!validate()) return;
              // amount — строка в рублях. При вызове реального API: rubToKopecks(amount)
              const d: ModalRequestData = { id: initialData?.id, amount, date, account, counterparty, article, purpose, priority, recurring, frequency: recurring ? frequency : undefined, endDate: recurring ? endDate : undefined, routeId: !isEdit ? selectedRoute : undefined };
              if (onSave) { onSave(d, false); } else { showToast(isEdit ? "Изменения сохранены" : (recurring ? "Заявка создана (повторяющийся платёж)" : "Заявка отправлена на согласование"), "success"); onClose(); }
            }}
            style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {submitLabel}
          </button>
          {!isEdit && (
            <button
              onClick={() => {
                if (!validate()) return;
                const d: ModalRequestData = { id: initialData?.id, amount, date, account, counterparty, article, purpose, priority, recurring, frequency: recurring ? frequency : undefined, endDate: recurring ? endDate : undefined, routeId: !isEdit ? selectedRoute : undefined };
                if (onSave) { onSave(d, true); } else { showToast("Черновик сохранён", "warning"); onClose(); }
              }}
              style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Сохранить черновик
            </button>
          )}
          <button onClick={onClose}
            style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────── */

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>{children}</label>;
}

function SelectField({ value, onChange, placeholder, options, focusStyle, baseInput, onFocus, onBlur }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
  focusStyle: CSSProperties; baseInput: CSSProperties;
  onFocus: () => void; onBlur: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur}
        style={{ ...baseInput, ...focusStyle, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
        <ChevronDown size={14} />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} role="switch" aria-checked={checked}
      style={{ width: 40, height: 22, borderRadius: 11, background: checked ? C.sage : C.warm, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.surface, position: "absolute", top: 2, left: checked ? 20 : 2, transition: "left 0.18s", boxShadow: "0 1px 3px rgba(44,44,30,0.25)" }} />
    </div>
  );
}
