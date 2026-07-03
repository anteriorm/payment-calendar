import { useState } from "react";
import { X, Calendar, Search, ChevronDown } from "lucide-react";
import { useToast } from "./Toast";
import { C } from "../tokens";

export interface ModalRequestData {
  id?:           number;
  amount?:       string;
  date?:         string;
  account?:      string;
  counterparty?: string;
  article?:      string;
  purpose?:      string;
  priority?:     Priority;
}

interface CreateRequestModalProps {
  onClose:        () => void;
  initialData?:   ModalRequestData;
  onSave?:        (data: ModalRequestData, asDraft: boolean) => void;
  accounts?:      { id: number; name: string; type?: string; currency?: string; initial_balance?: number }[];
  counterparties?: { id: number; name: string; inn?: string; details?: string }[];
  items?:         { id: number; name: string; type: string }[];
}

type Priority  = "high" | "medium" | "low";
type Frequency = "monthly" | "weekly" | "quarterly";

const PRIORITIES: { value: Priority; label: string; dot: string; accent: string; bg: string }[] = [
  { value: "high",   label: "Высокий", dot: C.danger, accent: C.danger,  bg: C.danger08              },
  { value: "medium", label: "Средний", dot: C.beige,  accent: "#7A5A30", bg: "rgba(224,192,160,0.22)" },
  { value: "low",    label: "Низкий",  dot: C.sage,   accent: C.sage,    bg: C.sage10                 },
];

export function CreateRequestModal({
  onClose,
  initialData,
  onSave,
  accounts = [],
  counterparties = [],
  items = [],
}: CreateRequestModalProps) {
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

  const focusStyle = (name: string): React.CSSProperties => {
    if (errors[name]) return { border: `1.5px solid ${C.danger}`, boxShadow: `0 0 0 3px rgba(192,80,74,0.15)` };
    if (focusedField === name) return { border: `1.5px solid ${C.sage}`, boxShadow: `0 0 0 3px ${C.sage20}` };
    return { border: `1px solid ${C.warm}` };
  };

  const baseInput: React.CSSProperties = {
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

  const accountOptions = accounts.map(a => ({ value: a.name, label: a.name }));
  const counterpartyNames = counterparties.map(c => c.name);
  const filteredCp = counterparty
    ? counterpartyNames.filter(c => c.toLowerCase().includes(counterparty.toLowerCase()))
    : counterpartyNames;
  const articleOptions = items
    .filter(i => i.type === 'payment')
    .map(i => ({ value: i.name, label: i.name }));

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
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, padding: 4, display: "flex", borderRadius: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ height: 1, background: C.warm, flexShrink: 0 }} />

        {/* Form body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div>
            <FieldLabel>Сумма (в рублях)</FieldLabel>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                onFocus={() => setFocusedField("amount")} onBlur={() => setFocusedField(null)}
                style={{ ...baseInput, ...focusStyle("amount"), paddingRight: 36 }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLt, pointerEvents: "none" }}>₽</span>
            </div>
            {errors.amount && <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{errors.amount}</span>}
          </div>

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

          <div>
            <FieldLabel>Счёт</FieldLabel>
            <SelectField
              value={account}
              onChange={setAccount}
              placeholder="Выберите счёт"
              options={accountOptions}
              focusStyle={focusStyle("account")}
              baseInput={baseInput}
              onFocus={() => setFocusedField("account")}
              onBlur={() => setFocusedField(null)}
            />
            {errors.account && <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{errors.account}</span>}
          </div>

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

          <div>
            <FieldLabel>Статья расходов</FieldLabel>
            <SelectField
              value={article}
              onChange={setArticle}
              placeholder="Выберите статью"
              options={articleOptions}
              focusStyle={focusStyle("article")}
              baseInput={baseInput}
              onFocus={() => setFocusedField("article")}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div>
            <FieldLabel>Назначение платежа</FieldLabel>
            <textarea placeholder="Укажите назначение платежа" value={purpose}
              onChange={e => setPurpose(e.target.value)}
              onFocus={() => setFocusedField("purpose")} onBlur={() => setFocusedField(null)}
              rows={3}
              style={{ ...baseInput, ...focusStyle("purpose"), resize: "vertical", minHeight: 80 }} />
          </div>

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

        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => {
              if (!validate()) return;
              const d: ModalRequestData = { id: initialData?.id, amount, date, account, counterparty, article, purpose, priority };
              if (onSave) { onSave(d, false); } else { showToast(isEdit ? "Изменения сохранены" : "Заявка отправлена на согласование", "success"); onClose(); }
            }}
            style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {submitLabel}
          </button>
          {!isEdit && (
            <button
              onClick={() => {
                if (!validate()) return;
                const d: ModalRequestData = { id: initialData?.id, amount, date, account, counterparty, article, purpose, priority };
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>{children}</label>;
}

function SelectField({ value, onChange, placeholder, options, focusStyle, baseInput, onFocus, onBlur }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
  focusStyle: React.CSSProperties; baseInput: React.CSSProperties;
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