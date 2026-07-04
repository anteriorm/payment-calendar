import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { Pencil, Trash2, Plus, X, RefreshCw } from "lucide-react";
import { C } from "../tokens";
import { useToast } from "./Toast";
import { required, nonNegative, inn as validateInn, loginFormat, firstError } from "../utils/validation";
import * as api from "../../api";
import type { Currency } from "../../api";
import { CURRENCY_SYMBOLS, registerAccountCurrency } from "../utils";

type TabId = "accounts" | "counterparties" | "articles" | "users" | "currencies";

const TABS: { id: TabId; label: string }[] = [
  { id: "accounts",       label: "Счета и кассы"   },
  { id: "counterparties", label: "Контрагенты"      },
  { id: "articles",       label: "Статьи движения"  },
  { id: "users",          label: "Пользователи"     },
  { id: "currencies",     label: "Валюты"           },
];

interface Account { id: number; name: string; currency: string; opening: number; current: number; }

const INITIAL_ACCOUNTS: Account[] = [
  { id: 1, name: "Расчётный счёт №1", currency: "RUB", opening: 500000, current: 980000 },
  { id: 2, name: "Расчётный счёт №2", currency: "USD", opening: 22000,  current: 4500   },
  { id: 3, name: "Касса",             currency: "RUB", opening: 50000,  current: 12500  },
];

const COUNTERPARTIES = [
  { id: 1, name: "ООО Поставщик Альфа", inn: "7701234567",   type: "Юр. лицо", contact: "Смирнов А.П."  },
  { id: 2, name: "ИП Смирнов А.В.",     inn: "772345678901", type: "ИП",        contact: "Смирнов А.В."  },
  { id: 3, name: "АО ТехСервис",        inn: "7803456789",   type: "Юр. лицо", contact: "Козлова Е.А."  },
  { id: 4, name: "ООО РентаГрупп",      inn: "7904567890",   type: "Юр. лицо", contact: "Петров И.С."   },
  { id: 5, name: "ПАО Энергоресурс",    inn: "7705678901",   type: "Юр. лицо", contact: "Васильев К.Д." },
];

const ARTICLES = [
  { id: 1, code: "01.01", name: "Аренда офиса",       type: "Расход", group: "Административные"     },
  { id: 2, code: "01.02", name: "Заработная плата",    type: "Расход", group: "Оплата труда"          },
  { id: 3, code: "01.03", name: "Расходные материалы", type: "Расход", group: "Административные"     },
  { id: 4, code: "01.04", name: "Услуги подрядчиков",  type: "Расход", group: "Операционные"         },
  { id: 5, code: "02.01", name: "Выручка от клиентов", type: "Доход",  group: "Основная деятельность"},
];

const USERS = [
  { id: 1, name: "Иванова Мария С.",  login: "m.ivanova",  role: "Инициатор",   status: "active"   },
  { id: 2, name: "Козлова Елена В.",  login: "e.kozlova",  role: "Согласующий", status: "active"   },
  { id: 3, name: "Петров Иван А.",    login: "i.petrov",   role: "Казначей",    status: "active"   },
  { id: 4, name: "Сидоров Андрей К.", login: "a.sidorov",  role: "Наблюдатель", status: "inactive" },
];

function currencySymbol(c: string): string {
  return c === "USD" ? "$" : c === "EUR" ? "€" : "₽";
}

function ruFmt(n: number): string {
  const s = Math.floor(Math.abs(n)).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ");
}

export function References({ canManage = true }: { canManage?: boolean }) {
  const [tab, setTab] = useState<TabId>("accounts");

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textDk, margin: 0 }}>Справочники</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "8px 18px",
                borderRadius: active ? "6px 6px 0 0" : 6,
                border: "none",
                background: active ? C.sage : C.ivory,
                color: active ? C.surface : C.textLt,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        {tab === "accounts"       && <AccountsTab canManage={canManage} />}
        {tab === "counterparties" && <CounterpartiesTab canManage={canManage} />}
        {tab === "articles"       && <ArticlesTab canManage={canManage} />}
        {tab === "users"          && <UsersTab canManage={canManage} />}
        {tab === "currencies"     && <CurrenciesTab canManage={canManage} />}
      </div>
    </div>
  );
}

/* ── Счета и кассы ─────────────────────────────────── */
function AccountsTab({ canManage = true }: { canManage?: boolean }) {
  const { showToast } = useToast();
  const [accounts,   setAccounts]   = useState<Account[]>(INITIAL_ACCOUNTS);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [delTarget,  setDelTarget]  = useState<Account | null>(null);

  const openAdd  = () => { setEditTarget(null); setShowModal(true); };
  const openEdit = (acc: Account) => { setEditTarget(acc); setShowModal(true); };
  const openDel  = (acc: Account) => setDelTarget(acc);

  const handleSave = (data: { name: string; currency: string; opening: number }) => {
    registerAccountCurrency(data.name, data.currency);
    if (editTarget) {
      setAccounts(prev => prev.map(a => a.id === editTarget.id ? { ...a, ...data } : a));
      showToast("Счёт успешно обновлён", "success");
    } else {
      const newAcc: Account = { id: Date.now(), ...data, current: data.opening };
      setAccounts(prev => [...prev, newAcc]);
      showToast("Счёт добавлен", "success");
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!delTarget) return;
    setAccounts(prev => prev.filter(a => a.id !== delTarget.id));
    showToast(`Счёт «${delTarget.name}» удалён`, "error");
    setDelTarget(null);
  };

  return (
    <>
      <TableToolbar>
        {canManage && (
          <button
            onClick={openAdd}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            <Plus size={14} />
            Добавить счёт
          </button>
        )}
      </TableToolbar>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.hdr }}>
            {["Название", "Валюта", "Нач. остаток", "Тек. остаток", "Статус", "Действия"].map(col => (
              <Th key={col}>{col}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td bold>{row.name}</Td>
              <Td>{row.currency}</Td>
              <Td mono>{ruFmt(row.opening)} {currencySymbol(row.currency)}</Td>
              <Td mono color={row.current < 50000 ? C.danger : C.textDk}>{ruFmt(row.current)} {currencySymbol(row.currency)}</Td>
              <Td><ActiveBadge /></Td>
              <Td>
                {canManage ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => openEdit(row)}>
                      <Pencil size={14} />
                    </IconBtn>
                    <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => openDel(row)}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                ) : <span style={{ fontSize: 12, color: "var(--tm-textLt)" }}>—</span>}
              </Td>
            </Tr>
          ))}
        </tbody>
      </table>

      {/* Account modal */}
      {showModal && (
        <AccountModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Delete confirmation */}
      {delTarget && (
        <ConfirmDialog
          title="Удалить счёт?"
          message={`Счёт «${delTarget.name}» будет удалён без возможности восстановления.`}
          confirmLabel="Удалить"
          confirmColor={C.danger}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </>
  );
}

/* ── Account modal ─────────────────────────────────── */
interface AccountModalProps {
  initial: Account | null;
  onSave:  (data: { name: string; currency: string; opening: number }) => void;
  onClose: () => void;
}

function AccountModal({ initial, onSave, onClose }: AccountModalProps) {
  const [name,     setName]     = useState(initial?.name     ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "RUB");
  const [opening,  setOpening]  = useState(initial ? String(initial.opening) : "");
  const [focused,  setFocused]  = useState<string | null>(null);

  const focusStyle = (f: string): CSSProperties =>
    focused === f
      ? { border: `1.5px solid ${C.sage}`, boxShadow: `0 0 0 3px ${C.sage20}` }
      : { border: `1px solid ${C.warm}` };

  const base: CSSProperties = {
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

  const [errors, setErrors] = useState<Record<string,string>>({});

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    const nameErr = required(name, "Название обязательно");
    const openErr = nonNegative(opening || "0");
    if (nameErr) e.name = nameErr;
    if (openErr) e.opening = openErr;
    if (Object.keys(e).length) { setErrors(e); return; }
    const n = parseFloat(opening.replace(/\s/g, "").replace(",", ".")) || 0;
    onSave({ name: name.trim(), currency, opening: n });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>
            {initial ? "Редактировать счёт" : "Добавить счёт"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex", padding: 4, borderRadius: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ height: 1, background: C.warm }} />

        {/* Form */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Название */}
          <div>
            <FieldLabel>Название</FieldLabel>
            <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({...p, name:""})); }}
              placeholder="Расчётный счёт №1"
              onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
              style={{ ...base, ...focusStyle("name"), ...(errors.name ? {border:`1.5px solid ${C.danger}`} : {}) }} />
            {errors.name && <ErrSpan>{errors.name}</ErrSpan>}
          </div>

          {/* Валюта */}
          <div>
            <FieldLabel>Валюта</FieldLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {["RUB", "USD", "EUR", "CNY"].map(cur => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 6,
                    border: currency === cur ? `2px solid ${C.sage}` : `1px solid ${C.warm}`,
                    background: currency === cur ? C.sage10 : C.surface,
                    color: currency === cur ? C.sage : C.textLt,
                    fontSize: 13,
                    fontWeight: currency === cur ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Начальный остаток */}
          <div>
            <FieldLabel>Начальный остаток</FieldLabel>
            <div style={{ position: "relative" }}>
              <input value={opening} onChange={e => setOpening(e.target.value)}
                placeholder="0"
                onFocus={() => setFocused("opening")} onBlur={() => setFocused(null)}
                style={{ ...base, ...focusStyle("opening"), paddingRight: 36, ...(errors.opening ? {border:`1.5px solid ${C.danger}`} : {}) }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLt, pointerEvents: "none" }}>{currencySymbol(currency)}</span>
            </div>
            {errors.opening && <ErrSpan>{errors.opening}</ErrSpan>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={handleSubmit}
            style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            Сохранить
          </button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirmation dialog ────────────────────────────── */
function ConfirmDialog({
  title, message, confirmLabel, confirmColor, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)", padding: "28px 28px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textDk, margin: "0 0 10px" }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.textLt, margin: "0 0 24px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{ padding: "9px 20px", borderRadius: 6, background: confirmColor, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Other tabs (read-only) ────────────────────────── */
/* ── Контрагенты (full CRUD) ─────────────────────────── */
interface Counterparty { id: number; name: string; inn: string; type: string; contact: string; }

function CounterpartiesTab({ canManage = true }: { canManage?: boolean }) {
  const { showToast } = useToast();
  const [rows,    setRows]    = useState<Counterparty[]>(COUNTERPARTIES.map(r => ({ ...r })));
  const [editing, setEditing] = useState<Counterparty | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delTgt,  setDelTgt]  = useState<Counterparty | null>(null);
  const save = (r: Counterparty) => {
    if (r.id < 0) { setRows(p => [...p, { ...r, id: Date.now() }]); showToast("Контрагент добавлен", "success"); }
    else          { setRows(p => p.map(x => x.id === r.id ? r : x)); showToast("Контрагент обновлён", "success"); }
    setEditing(null); setShowAdd(false);
  };
  return (
    <>
      <TableToolbar>
        {canManage && (
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          <Plus size={14} />Добавить контрагента
        </button>
        )}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["Наименование","ИНН","Тип","Контакт","Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td bold>{row.name}</Td><Td mono>{row.inn}</Td><Td>{row.type}</Td><Td>{row.contact}</Td>
              <Td><div style={{ display: "flex", gap: 6 }}>
                {canManage ? <>
                  <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => setEditing(row)}><Pencil size={14} /></IconBtn>
                  <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => setDelTgt(row)}><Trash2 size={14} /></IconBtn>
                </> : <span style={{ fontSize: 12, color: "var(--tm-textLt)" }}>—</span>}
              </div></Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {(showAdd || editing) && <CpModal initial={editing} onSave={save} onClose={() => { setEditing(null); setShowAdd(false); }} />}
      {delTgt && <ConfirmDialog title="Удалить контрагента?" message={`«${delTgt.name}» будет удалён.`} confirmLabel="Удалить" confirmColor={C.danger}
        onConfirm={() => { setRows(p => p.filter(x => x.id !== delTgt!.id)); showToast("Контрагент удалён", "error"); setDelTgt(null); }} onCancel={() => setDelTgt(null)} />}
    </>
  );
}
function CpModal({ initial, onSave, onClose }: { initial: Counterparty | null; onSave: (r: Counterparty) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [inn,  setInn]  = useState(initial?.inn  ?? "");
  const [type, setType] = useState(initial?.type ?? "Юр. лицо");
  const [ctc,  setCtc]  = useState(initial?.contact ?? "");
  const [errors, setErrors] = useState<Record<string,string>>({});

  const inp: CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  const errBorder = { border: `1.5px solid ${C.danger}` };

  const handleSave = () => {
    const e: Record<string,string> = {};
    const nameErr = required(name, "Наименование обязательно");
    const innErr  = inn.trim() ? validateInn(inn) : null;  // ИНН опционален для Физ. лица
    if (nameErr) e.name = nameErr;
    if (innErr)  e.inn  = innErr;
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ id: initial?.id ?? -1, name: name.trim(), inn, type, contact: ctc });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать контрагента" : "Добавить контрагента"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex" }}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <FieldLabel>Наименование <Req /></FieldLabel>
            <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({...p, name:""})); }} style={{ ...inp, ...(errors.name ? errBorder : {}) }} />
            {errors.name && <ErrSpan>{errors.name}</ErrSpan>}
          </div>
          <div>
            <FieldLabel>ИНН (10 или 12 цифр)</FieldLabel>
            <input value={inn} onChange={e => { setInn(e.target.value); setErrors(p => ({...p, inn:""})); }} style={{ ...inp, ...(errors.inn ? errBorder : {}) }} placeholder="7701234567" />
            {errors.inn && <ErrSpan>{errors.inn}</ErrSpan>}
          </div>
          <div><FieldLabel>Тип</FieldLabel>
            <div style={{ display: "flex", gap: 8 }}>{["Юр. лицо","ИП","Физ. лицо"].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: type === t ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: type === t ? C.sage10 : C.surface, color: type === t ? C.sage : C.textLt, fontSize: 12, fontWeight: type === t ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t}</button>
            ))}</div>
          </div>
          <div><FieldLabel>Контакт</FieldLabel><input value={ctc} onChange={e => setCtc(e.target.value)} style={inp} /></div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={handleSave} style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Сохранить</button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Статьи движения (full CRUD) ─────────────────────── */
interface Article { id: number; code: string; name: string; type: string; group: string; }

function ArticlesTab({ canManage = true }: { canManage?: boolean }) {
  const { showToast } = useToast();
  const [rows,    setRows]    = useState<Article[]>(ARTICLES.map(r => ({ ...r })));
  const [editing, setEditing] = useState<Article | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delTgt,  setDelTgt]  = useState<Article | null>(null);
  const save = (r: Article) => {
    if (r.id < 0) { setRows(p => [...p, { ...r, id: Date.now() }]); showToast("Статья добавлена", "success"); }
    else          { setRows(p => p.map(x => x.id === r.id ? r : x)); showToast("Статья обновлена", "success"); }
    setEditing(null); setShowAdd(false);
  };
  return (
    <>
      <TableToolbar>
        {canManage && <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          <Plus size={14} />Добавить статью
        </button>}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["Код","Наименование","Тип","Группа","Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td mono>{row.code}</Td><Td bold>{row.name}</Td>
              <Td><span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: row.type === "Доход" ? C.sage20 : C.danger15, color: row.type === "Доход" ? "#3D6B3D" : "#8B2020" }}>{row.type}</span></Td>
              <Td color={C.textLt}>{row.group}</Td>
              <Td><div style={{ display: "flex", gap: 6 }}>
                {canManage ? <>
                  <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => setEditing(row)}><Pencil size={14} /></IconBtn>
                  <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => setDelTgt(row)}><Trash2 size={14} /></IconBtn>
                </> : <span style={{ fontSize: 12, color: "var(--tm-textLt)" }}>—</span>}
              </div></Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {(showAdd || editing) && <ArtModal initial={editing} onSave={save} onClose={() => { setEditing(null); setShowAdd(false); }} />}
      {delTgt && <ConfirmDialog title="Удалить статью?" message={`«${delTgt.name}» будет удалена.`} confirmLabel="Удалить" confirmColor={C.danger}
        onConfirm={() => { setRows(p => p.filter(x => x.id !== delTgt!.id)); showToast("Статья удалена", "error"); setDelTgt(null); }} onCancel={() => setDelTgt(null)} />}
    </>
  );
}
function ArtModal({ initial, onSave, onClose }: { initial: Article | null; onSave: (r: Article) => void; onClose: () => void }) {
  const [code, setCode] = useState(initial?.code ?? ""); const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "Расход"); const [group, setGroup] = useState(initial?.group ?? "");
  const inp: CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать статью" : "Добавить статью"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex" }}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: "0 0 90px" }}><FieldLabel>Код</FieldLabel><input value={code} onChange={e => setCode(e.target.value)} style={inp} placeholder="01.01" /></div>
            <div style={{ flex: 1 }}><FieldLabel>Наименование</FieldLabel><input value={name} onChange={e => setName(e.target.value)} style={inp} /></div>
          </div>
          <div><FieldLabel>Тип</FieldLabel>
            <div style={{ display: "flex", gap: 8 }}>{["Расход","Доход"].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: type === t ? `2px solid ${t === "Доход" ? C.sage : C.danger}` : `1px solid ${C.warm}`, background: type === t ? (t === "Доход" ? C.sage10 : C.danger15) : C.surface, color: type === t ? (t === "Доход" ? C.sage : C.danger) : C.textLt, fontSize: 13, fontWeight: type === t ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t}</button>
            ))}</div>
          </div>
          <div><FieldLabel>Группа</FieldLabel><input value={group} onChange={e => setGroup(e.target.value)} style={inp} placeholder="Административные" /></div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={() => {
            const e: Record<string,string> = {};
            if (!code.trim()) e.code = "Код обязателен";
            if (!name.trim()) e.name = "Наименование обязательно";
            if (Object.keys(e).length) { alert(Object.values(e).join("\n")); return; }
            onSave({ id: initial?.id ?? -1, code: code.trim(), name: name.trim(), type, group: group.trim() });
          }} style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Сохранить</button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Пользователи (full CRUD) ────────────────────────── */
interface AppUser { id: number; name: string; login: string; role: string; status: string; }

function UsersTab({ canManage = true }: { canManage?: boolean }) {
  const { showToast } = useToast();
  const [rows,    setRows]    = useState<AppUser[]>(USERS.map(r => ({ ...r })));
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delTgt,  setDelTgt]  = useState<AppUser | null>(null);
  const save = (r: AppUser) => {
    if (r.id < 0) { setRows(p => [...p, { ...r, id: Date.now() }]); showToast("Пользователь добавлен", "success"); }
    else          { setRows(p => p.map(x => x.id === r.id ? r : x)); showToast("Пользователь обновлён", "success"); }
    setEditing(null); setShowAdd(false);
  };
  const toggleStatus = (id: number) => setRows(p => p.map(x => x.id === id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x));
  return (
    <>
      <TableToolbar>
        {canManage && <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          <Plus size={14} />Добавить пользователя
        </button>}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["ФИО","Логин","Роль","Статус","Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td bold>{row.name}</Td>
              <Td mono color={C.textLt}>{row.login}</Td>
              <Td><span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.olive20, color: "#555540" }}>{row.role}</span></Td>
              <Td><button onClick={() => toggleStatus(row.id)} title="Переключить статус" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {row.status === "active" ? <ActiveBadge /> : <InactiveBadge />}
              </button></Td>
              <Td><div style={{ display: "flex", gap: 6 }}>
                {canManage ? <>
                  <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => setEditing(row)}><Pencil size={14} /></IconBtn>
                  <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => setDelTgt(row)}><Trash2 size={14} /></IconBtn>
                </> : <span style={{ fontSize: 12, color: "var(--tm-textLt)" }}>—</span>}
              </div></Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {(showAdd || editing) && <UserModal initial={editing} onSave={save} onClose={() => { setEditing(null); setShowAdd(false); }} />}
      {delTgt && <ConfirmDialog title="Удалить пользователя?" message={`«${delTgt.name}» будет удалён.`} confirmLabel="Удалить" confirmColor={C.danger}
        onConfirm={() => { setRows(p => p.filter(x => x.id !== delTgt!.id)); showToast("Пользователь удалён", "error"); setDelTgt(null); }} onCancel={() => setDelTgt(null)} />}
    </>
  );
}
function UserModal({ initial, onSave, onClose }: { initial: AppUser | null; onSave: (r: AppUser) => void; onClose: () => void }) {
  const [name,   setName]   = useState(initial?.name   ?? "");
  const [login,  setLogin]  = useState(initial?.login  ?? "");
  const [role,   setRole]   = useState(initial?.role   ?? "Инициатор");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const inp: CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать пользователя" : "Добавить пользователя"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex" }}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><FieldLabel>ФИО</FieldLabel><input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Иванова Мария С." /></div>
          <div><FieldLabel>Логин</FieldLabel><input value={login} onChange={e => setLogin(e.target.value)} style={inp} placeholder="m.ivanova" /></div>
          <div><FieldLabel>Роль</FieldLabel>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["Инициатор","Согласующий","Казначей","Наблюдатель"].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ padding: "7px 12px", borderRadius: 6, border: role === r ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: role === r ? C.sage10 : C.surface, color: role === r ? C.sage : C.textLt, fontSize: 12, fontWeight: role === r ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{r}</button>
            ))}</div>
          </div>
          <div><FieldLabel>Статус</FieldLabel>
            <div style={{ display: "flex", gap: 8 }}>{[["active","Активен"],["inactive","Неактивен"]].map(([v,l]) => (
              <button key={v} onClick={() => setStatus(v)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: status === v ? `2px solid ${v === "active" ? C.sage : C.warm}` : `1px solid ${C.warm}`, background: status === v ? (v === "active" ? C.sage10 : C.ivory) : C.surface, color: status === v ? (v === "active" ? C.sage : C.textLt) : C.textLt, fontSize: 13, fontWeight: status === v ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{l}</button>
            ))}</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={() => {
            const errs: string[] = [];
            if (!name.trim())  errs.push("ФИО обязательно");
            if (!login.trim()) errs.push("Логин обязателен");
            else if (loginFormat(login)) errs.push(loginFormat(login)!);
            if (errs.length) { alert(errs.join("\n")); return; }
            onSave({ id: initial?.id ?? -1, name: name.trim(), login: login.trim(), role, status });
          }} style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Сохранить</button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Валюты ────────────────────────────────────────── */
function CurrenciesTab({ canManage = true }: { canManage?: boolean }) {
  const { showToast } = useToast();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editCode,   setEditCode]   = useState<string | null>(null);
  const [rateInput,  setRateInput]  = useState("");

  useEffect(() => {
    api.currencies.getAll().then(data => { setCurrencies(data as Currency[]); setLoading(false); });
  }, []);

  const openEdit = (c: Currency) => {
    setEditCode(c.code);
    setRateInput(String(c.rate_to_rub));
  };

  const handleSaveRate = async (code: string) => {
    const n = parseFloat(rateInput.replace(",", "."));
    if (isNaN(n) || n <= 0) { showToast("Введите корректный курс", "error"); return; }
    await api.currencies.updateRate(code, n);
    setCurrencies(cs => cs.map(c => c.code === code ? { ...c, rate_to_rub: n, updated_at: "02.07.2026" } : c));
    setEditCode(null);
    showToast(`Курс ${code} обновлён`, "success");
  };

  return (
    <>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.warm}`, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: C.textLt }}>
          Курсы обновляются вручную. При подключении бэкенда — автоматически через ЦБ РФ.
        </span>
        <button onClick={() => { setLoading(true); api.currencies.getAll().then(d => { setCurrencies(d as Currency[]); setLoading(false); showToast("Курсы обновлены", "success"); }); }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, background: C.ivory, border: `1px solid ${C.warm}`, fontSize: 12, color: C.textLt, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          <RefreshCw size={12} />
          Обновить
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.hdr }}>
            {["Код", "Символ", "Название", "Курс к ₽ (1 ед. = N ₽)", "Обновлено", "Действия"].map(col => (
              <Th key={col}>{col}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.textLt, fontSize: 13 }}>Загрузка…</td></tr>
          ) : currencies.map((cur, i) => (
            <Tr key={cur.code} i={i}>
              <Td bold>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: cur.code === "RUB" ? C.sage10 : cur.code === "USD" ? "rgba(45,120,200,0.12)" : cur.code === "EUR" ? "rgba(60,100,200,0.10)" : C.beige30, color: cur.code === "RUB" ? "#3D6B3D" : cur.code === "USD" ? "#1A5DA0" : cur.code === "EUR" ? "#2040A0" : "#7A5A30" }}>
                    {cur.code}
                  </span>
                </span>
              </Td>
              <Td mono><span style={{ fontSize: 18, color: C.textDk }}>{cur.symbol}</span></Td>
              <Td>{cur.name}</Td>
              <Td mono>
                {editCode === cur.code ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input autoFocus value={rateInput} onChange={e => setRateInput(e.target.value)}
                      style={{ width: 90, padding: "5px 8px", borderRadius: 5, border: `1.5px solid ${C.sage}`, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
                    <button onClick={() => handleSaveRate(cur.code)}
                      style={{ padding: "5px 10px", borderRadius: 5, background: C.sage, color: C.surface, border: "none", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                      OK
                    </button>
                    <button onClick={() => setEditCode(null)}
                      style={{ padding: "5px 8px", borderRadius: 5, background: "transparent", color: C.textLt, border: `1px solid ${C.warm}`, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <span style={{ color: cur.code === "RUB" ? C.textLt : C.textDk }}>
                    {cur.code === "RUB" ? "1,00 (базовая)" : `${cur.rate_to_rub.toFixed(2)} ₽`}
                  </span>
                )}
              </Td>
              <Td color={C.textLt}>{cur.updated_at}</Td>
              <Td>
                {canManage && cur.code !== "RUB" ? (
                  <IconBtn title="Изменить курс" hoverColor={C.sage} onClick={() => openEdit(cur)}>
                    <Pencil size={14} />
                  </IconBtn>
                ) : (
                  <span style={{ fontSize: 12, color: C.textLt }}>—</span>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {/* Пояснение о конвертации */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.warm}`, fontSize: 12, color: C.textLt, display: "flex", gap: 24 }}>
        {currencies.filter(c => c.code !== "RUB").map(c => (
          <span key={c.code}>
            {c.symbol} 1 = {c.rate_to_rub.toFixed(2)} ₽
          </span>
        ))}
      </div>
    </>
  );
}

/* ── Shared primitives ─────────────────────────────── */
function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.warm}`, display: "flex", justifyContent: "flex-end" }}>
      {children}
    </div>
  );
}

function AddBtn({ label }: { label: string }) {
  return (
    <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
      <Plus size={14} />
      {label}
    </button>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>{children}</th>;
}

function Tr({ children, i }: { children: ReactNode; i: number }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.beige30 : i % 2 === 0 ? C.surface : C.ivory50, transition: "background 0.1s", borderBottom: `1px solid ${C.ivory}` }}>
      {children}
    </tr>
  );
}

function Td({ children, bold, mono, color }: { children?: ReactNode; bold?: boolean; mono?: boolean; color?: string }) {
  return <td style={{ padding: "11px 14px", color: color ?? C.textDk, fontWeight: bold ? 600 : 400, fontVariantNumeric: mono ? "tabular-nums" : undefined, whiteSpace: "nowrap" }}>{children}</td>;
}

function ActiveBadge() {
  return <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.sage, color: C.surface }}>Активен</span>;
}

function InactiveBadge() {
  return <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.ivory, color: C.textLt }}>Неактивен</span>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>{children}</label>;
}

function IconBtn({ children, title, hoverColor, onClick }: { children: ReactNode; title: string; hoverColor: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "none", border: "none", cursor: "pointer", color: hov ? hoverColor : C.olive, padding: 2, display: "flex", borderRadius: 4, transition: "color 0.15s" }}>
      {children}
    </button>
  );
}

function ReadOnlyActions() {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => {}}>
        <Pencil size={14} />
      </IconBtn>
      <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => {}}>
        <Trash2 size={14} />
      </IconBtn>
    </div>
  );
}

function ErrSpan({ children }: { children: string }) {
  return <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{children}</span>;
}
function Req() {
  return <span style={{ color: "var(--tm-danger)", marginLeft: 2 }}>*</span>;
}
