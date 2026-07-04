import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { C } from "../tokens";
import { useToast } from "./Toast";
import { required, nonNegative, inn as validateInn, loginFormat } from "../utils/validation";
import * as api from "../../api";

type TabId = "accounts" | "counterparties" | "articles" | "users";

const TABS: { id: TabId; label: string }[] = [
  { id: "accounts",       label: "Счета и кассы"   },
  { id: "counterparties", label: "Контрагенты"      },
  { id: "articles",       label: "Статьи движения"  },
  { id: "users",          label: "Пользователи"     },
];

const TYPE_LABELS: Record<string, string> = { entity: "Юр. лицо", individual: "ИП" };
const TYPE_VALUES: Record<string, string> = { "Юр. лицо": "entity", "ИП": "individual" };
const ITEM_LABELS: Record<string, string> = { payment: "Расход", income: "Доход" };
const ITEM_VALUES: Record<string, string> = { "Расход": "payment", "Доход": "income" };
const ROLE_LABELS: Record<string, string> = { initiator: "Инициатор", manager: "Согласующий", treasurer: "Казначей", admin: "Администратор" };
const ROLE_VALUES: Record<string, string> = { "Инициатор": "initiator", "Согласующий": "manager", "Казначей": "treasurer", "Администратор": "admin" };

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
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: "8px 18px", borderRadius: active ? "6px 6px 0 0" : 6, border: "none", background: active ? C.sage : C.ivory, color: active ? C.surface : C.textLt, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "background 0.15s, color 0.15s" }}>
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)" }}>
        {tab === "accounts"       && <AccountsTab canManage={canManage} />}
        {tab === "counterparties" && <CounterpartiesTab canManage={canManage} />}
        {tab === "articles"       && <ArticlesTab canManage={canManage} />}
        {tab === "users"          && <UsersTab canManage={canManage} />}
      </div>
    </div>
  );
}

/* ── Счета и кассы ─────────────────────────────────── */
function AccountsTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [delTarget, setDelTarget] = useState<any | null>(null);

  const load = () => { setLoading(true); api.accounts.getAll().then(setAccounts).catch(() => showToast("Ошибка загрузки счетов", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSave = async (data: { name: string; currency: string; opening: number }) => {
    try {
      if (editTarget) {
        await api.accounts.update(editTarget.id, { name: data.name, currency: data.currency, opening: data.opening });
        showToast("Счёт обновлён", "success");
      } else {
        await api.accounts.create({ name: data.name, type: "bank", currency: data.currency, opening: data.opening, current: data.opening });
        showToast("Счёт добавлен", "success");
      }
      load(); setShowModal(false);
    } catch { showToast("Ошибка сохранения", "error"); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await api.accounts.delete(delTarget.id);
      showToast(`Счёт «${delTarget.name}» удалён`, "error");
      load();
    } catch { showToast("Ошибка удаления", "error"); }
    setDelTarget(null);
  };

  if (loading) return <div style={{ padding: 24, color: C.textLt }}>Загрузка...</div>;

  return (
    <>
      <TableToolbar>
        {canManage && <button onClick={() => { setEditTarget(null); setShowModal(true); }} style={addBtnStyle}><Plus size={14} /> Добавить счёт</button>}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["Название", "Валюта", "Нач. остаток", "Тек. остаток", "Статус", "Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {accounts.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td bold>{row.name}</Td>
              <Td>{row.currency}</Td>
              <Td mono>{ruFmt(row.opening)} ₽</Td>
              <Td mono color={row.current < 0 ? C.danger : C.textDk}>{ruFmt(row.current)} ₽</Td>
              <Td><ActiveBadge /></Td>
              <Td>{canManage ? <ActionBtns onEdit={() => { setEditTarget(row); setShowModal(true); }} onDel={() => setDelTarget(row)} /> : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {showModal && <AccountModal initial={editTarget} onSave={handleSave} onClose={() => setShowModal(false)} />}
      {delTarget && <ConfirmDialog title="Удалить счёт?" message={`Счёт «${delTarget.name}» будет удалён.`} confirmLabel="Удалить" confirmColor={C.danger} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
    </>
  );
}

/* ── Контрагенты ───────────────────────────────────── */
function CounterpartiesTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delTgt, setDelTgt] = useState<any | null>(null);

  const load = () => { setLoading(true); api.counterparties.getAll().then(setRows).catch(() => showToast("Ошибка загрузки контрагентов", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSave = async (data: { name: string; inn: string; type: string; contact: string }) => {
    try {
      const apiType = TYPE_VALUES[data.type] || "entity";
      if (editing) {
        await api.counterparties.update(editing.id, { name: data.name, inn: data.inn, type: apiType as any, contact: data.contact });
        showToast("Контрагент обновлён", "success");
      } else {
        await api.counterparties.create({ name: data.name, inn: data.inn, type: apiType as any, contact: data.contact });
        showToast("Контрагент добавлен", "success");
      }
      load(); setEditing(null); setShowAdd(false);
    } catch { showToast("Ошибка сохранения", "error"); }
  };

  const handleDelete = async () => {
    if (!delTgt) return;
    try {
      await api.counterparties.delete(delTgt.id);
      showToast("Контрагент удалён", "error");
      load();
    } catch { showToast("Ошибка удаления", "error"); }
    setDelTgt(null);
  };

  if (loading) return <div style={{ padding: 24, color: C.textLt }}>Загрузка...</div>;

  return (
    <>
      <TableToolbar>
        {canManage && <button onClick={() => setShowAdd(true)} style={addBtnStyle}><Plus size={14} /> Добавить контрагента</button>}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["Наименование", "ИНН", "Тип", "Контакт", "Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td bold>{row.name}</Td><Td mono>{row.inn}</Td><Td>{TYPE_LABELS[row.type] ?? row.type}</Td><Td>{row.contact}</Td>
              <Td>{canManage ? <ActionBtns onEdit={() => setEditing(row)} onDel={() => setDelTgt(row)} /> : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {(showAdd || editing) && <CpModal initial={editing} onSave={handleSave} onClose={() => { setEditing(null); setShowAdd(false); }} />}
      {delTgt && <ConfirmDialog title="Удалить контрагента?" message={`«${delTgt.name}» будет удалён.`} confirmLabel="Удалить" confirmColor={C.danger} onConfirm={handleDelete} onCancel={() => setDelTgt(null)} />}
    </>
  );
}

/* ── Статьи движения ───────────────────────────────── */
function ArticlesTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delTgt, setDelTgt] = useState<any | null>(null);

  const load = () => { setLoading(true); api.items.getAll().then(setRows).catch(() => showToast("Ошибка загрузки статей", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSave = async (data: { code: string; name: string; type: string; group: string }) => {
    try {
      const apiType = ITEM_VALUES[data.type] || "payment";
      if (editing) {
        await api.items.update(editing.id, { code: data.code, name: data.name, type: apiType as any, group: data.group });
        showToast("Статья обновлена", "success");
      } else {
        await api.items.create({ code: data.code, name: data.name, type: apiType as any, group: data.group });
        showToast("Статья добавлена", "success");
      }
      load(); setEditing(null); setShowAdd(false);
    } catch { showToast("Ошибка сохранения", "error"); }
  };

  const handleDelete = async () => {
    if (!delTgt) return;
    try {
      await api.items.delete(delTgt.id);
      showToast("Статья удалена", "error");
      load();
    } catch { showToast("Ошибка удаления", "error"); }
    setDelTgt(null);
  };

  if (loading) return <div style={{ padding: 24, color: C.textLt }}>Загрузка...</div>;

  return (
    <>
      <TableToolbar>
        {canManage && <button onClick={() => setShowAdd(true)} style={addBtnStyle}><Plus size={14} /> Добавить статью</button>}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["Код", "Наименование", "Тип", "Группа", "Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td mono>{row.code}</Td><Td bold>{row.name}</Td>
              <Td><span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: row.type === "income" ? C.sage20 : C.danger15, color: row.type === "income" ? "#3D6B3D" : "#8B2020" }}>{ITEM_LABELS[row.type] ?? row.type}</span></Td>
              <Td color={C.textLt}>{row.group}</Td>
              <Td>{canManage ? <ActionBtns onEdit={() => setEditing(row)} onDel={() => setDelTgt(row)} /> : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {(showAdd || editing) && <ArtModal initial={editing} onSave={handleSave} onClose={() => { setEditing(null); setShowAdd(false); }} />}
      {delTgt && <ConfirmDialog title="Удалить статью?" message={`«${delTgt.name}» будет удалена.`} confirmLabel="Удалить" confirmColor={C.danger} onConfirm={handleDelete} onCancel={() => setDelTgt(null)} />}
    </>
  );
}

/* ── Пользователи ──────────────────────────────────── */
function UsersTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delTgt, setDelTgt] = useState<any | null>(null);

  const load = () => { setLoading(true); api.users.getAll().then(setRows).catch(() => showToast("Ошибка загрузки пользователей", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSave = async (data: { name: string; email: string; role: string; password?: string }) => {
    try {
      const apiRole = ROLE_VALUES[data.role] || "initiator";
      if (editing) {
        const payload: any = { name: data.name, email: data.email, role: apiRole };
        if (data.password) payload.password = data.password;
        await api.users.update(editing.id, payload);
        showToast("Пользователь обновлён", "success");
      } else {
        await api.users.create({ name: data.name, email: data.email, role: apiRole as any, status: "active", password: data.password || "password" });
        showToast("Пользователь добавлен", "success");
      }
      load(); setEditing(null); setShowAdd(false);
    } catch { showToast("Ошибка сохранения", "error"); }
  };

  const handleDelete = async () => {
    if (!delTgt) return;
    try {
      await api.users.delete(delTgt.id);
      showToast("Пользователь удалён", "error");
      load();
    } catch { showToast("Ошибка удаления", "error"); }
    setDelTgt(null);
  };

  if (loading) return <div style={{ padding: 24, color: C.textLt }}>Загрузка...</div>;

  return (
    <>
      <TableToolbar>
        {canManage && <button onClick={() => setShowAdd(true)} style={addBtnStyle}><Plus size={14} /> Добавить пользователя</button>}
      </TableToolbar>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: C.hdr }}>{["ФИО", "Email", "Роль", "Статус", "Действия"].map(c => <Th key={c}>{c}</Th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={row.id} i={i}>
              <Td bold>{row.name}</Td>
              <Td mono color={C.textLt}>{row.email}</Td>
              <Td><span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.olive20, color: "#555540" }}>{ROLE_LABELS[row.role] ?? row.role}</span></Td>
              <Td><ActiveBadge /></Td>
              <Td>{canManage ? <ActionBtns onEdit={() => setEditing(row)} onDel={() => setDelTgt(row)} /> : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </table>
      {(showAdd || editing) && <UserModal initial={editing} onSave={handleSave} onClose={() => { setEditing(null); setShowAdd(false); }} />}
      {delTgt && <ConfirmDialog title="Удалить пользователя?" message={`«${delTgt.name}» будет удалён.`} confirmLabel="Удалить" confirmColor={C.danger} onConfirm={handleDelete} onCancel={() => setDelTgt(null)} />}
    </>
  );
}

/* ── Account modal ─────────────────────────────────── */
function AccountModal({ initial, onSave, onClose }: { initial: any; onSave: (d: any) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "RUB");
  const [opening, setOpening] = useState(initial ? String(initial.opening) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<string | null>(null);

  const focusStyle = (f: string): React.CSSProperties => focused === f ? { border: `1.5px solid ${C.sage}`, boxShadow: `0 0 0 3px ${C.sage20}` } : { border: `1px solid ${C.warm}` };
  const base: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box", transition: "border 0.15s, box-shadow 0.15s" };

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
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textDk, margin: 0 }}>{initial ? "Редактировать счёт" : "Добавить счёт"}</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
        </div>
        <div style={{ height: 1, background: C.warm }} />
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <FieldLabel>Название</FieldLabel>
            <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} style={{ ...base, ...focusStyle("name"), ...(errors.name ? { border: `1.5px solid ${C.danger }` } : {}) }} />
            {errors.name && <ErrSpan>{errors.name}</ErrSpan>}
          </div>
          <div>
            <FieldLabel>Валюта</FieldLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {["RUB", "USD", "EUR"].map(cur => (
                <button key={cur} onClick={() => setCurrency(cur)} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: currency === cur ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: currency === cur ? C.sage10 : C.surface, color: currency === cur ? C.sage : C.textLt, fontSize: 13, fontWeight: currency === cur ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{cur}</button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Начальный остаток</FieldLabel>
            <input value={opening} onChange={e => setOpening(e.target.value)} onFocus={() => setFocused("opening")} onBlur={() => setFocused(null)} style={{ ...base, ...focusStyle("opening"), ...(errors.opening ? { border: `1.5px solid ${C.danger}` } : {}) }} placeholder="0" />
            {errors.opening && <ErrSpan>{errors.opening}</ErrSpan>}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={handleSubmit} style={saveBtnStyle}>Сохранить</button>
          <button onClick={onClose} style={cancelBtnStyle}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Counterparty modal ────────────────────────────── */
function CpModal({ initial, onSave, onClose }: { initial: any; onSave: (d: any) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [inn, setInn] = useState(initial?.inn ?? "");
  const [type, setType] = useState(TYPE_LABELS[initial?.type] ?? "Юр. лицо");
  const [ctc, setCtc] = useState(initial?.contact ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };

  const handleSave = () => {
    const e: Record<string, string> = {};
    const nameErr = required(name, "Наименование обязательно");
    const innErr = inn.trim() ? validateInn(inn) : null;
    if (nameErr) e.name = nameErr;
    if (innErr) e.inn = innErr;
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ name: name.trim(), inn, type, contact: ctc });
  };

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать контрагента" : "Добавить контрагента"}</span>
          <button onClick={onClose} style={closeBtnStyle}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><FieldLabel>Наименование *</FieldLabel><input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }} style={{ ...inp, ...(errors.name ? { border: `1.5px solid ${C.danger}` } : {}) }} />{errors.name && <ErrSpan>{errors.name}</ErrSpan>}</div>
          <div><FieldLabel>ИНН (10 или 12 цифр)</FieldLabel><input value={inn} onChange={e => { setInn(e.target.value); setErrors(p => ({ ...p, inn: "" })); }} style={{ ...inp, ...(errors.inn ? { border: `1.5px solid ${C.danger}` } : {}) }} placeholder="7701234567" />{errors.inn && <ErrSpan>{errors.inn}</ErrSpan>}</div>
          <div><FieldLabel>Тип</FieldLabel><div style={{ display: "flex", gap: 8 }}>{["Юр. лицо", "ИП"].map(t => (<button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: type === t ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: type === t ? C.sage10 : C.surface, color: type === t ? C.sage : C.textLt, fontSize: 12, fontWeight: type === t ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t}</button>))}</div></div>
          <div><FieldLabel>Контакт</FieldLabel><input value={ctc} onChange={e => setCtc(e.target.value)} style={inp} /></div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={handleSave} style={saveBtnStyle}>Сохранить</button>
          <button onClick={onClose} style={cancelBtnStyle}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Article modal ─────────────────────────────────── */
function ArtModal({ initial, onSave, onClose }: { initial: any; onSave: (d: any) => void; onClose: () => void }) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(ITEM_LABELS[initial?.type] ?? "Расход");
  const [group, setGroup] = useState(initial?.group ?? "");
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать статью" : "Добавить статью"}</span>
          <button onClick={onClose} style={closeBtnStyle}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: "0 0 90px" }}><FieldLabel>Код</FieldLabel><input value={code} onChange={e => setCode(e.target.value)} style={inp} placeholder="01.01" /></div>
            <div style={{ flex: 1 }}><FieldLabel>Наименование</FieldLabel><input value={name} onChange={e => setName(e.target.value)} style={inp} /></div>
          </div>
          <div><FieldLabel>Тип</FieldLabel><div style={{ display: "flex", gap: 8 }}>{["Расход", "Доход"].map(t => (<button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: type === t ? `2px solid ${t === "Доход" ? C.sage : C.danger}` : `1px solid ${C.warm}`, background: type === t ? (t === "Доход" ? C.sage10 : C.danger15) : C.surface, color: type === t ? (t === "Доход" ? C.sage : C.danger) : C.textLt, fontSize: 13, fontWeight: type === t ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t}</button>))}</div></div>
          <div><FieldLabel>Группа</FieldLabel><input value={group} onChange={e => setGroup(e.target.value)} style={inp} placeholder="Административные" /></div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={() => {
            if (!code.trim() || !name.trim()) { alert("Код и наименование обязательны"); return; }
            onSave({ code: code.trim(), name: name.trim(), type, group: group.trim() });
          }} style={saveBtnStyle}>Сохранить</button>
          <button onClick={onClose} style={cancelBtnStyle}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── User modal ────────────────────────────────────── */
function UserModal({ initial, onSave, onClose }: { initial: any; onSave: (d: any) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState(ROLE_LABELS[initial?.role] ?? "Инициатор");
  const [password, setPassword] = useState("");
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать пользователя" : "Добавить пользователя"}</span>
          <button onClick={onClose} style={closeBtnStyle}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><FieldLabel>ФИО</FieldLabel><input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Иванова Мария С." /></div>
          <div><FieldLabel>Email</FieldLabel><input value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="m.ivanova@truemachine.ru" /></div>
          {!initial && <div><FieldLabel>Пароль</FieldLabel><input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} placeholder="минимум 6 символов" /></div>}
          <div><FieldLabel>Роль</FieldLabel><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["Инициатор", "Согласующий", "Казначей", "Администратор"].map(r => (<button key={r} onClick={() => setRole(r)} style={{ padding: "7px 12px", borderRadius: 6, border: role === r ? `2px solid ${C.sage}` : `1px solid ${C.warm}`, background: role === r ? C.sage10 : C.surface, color: role === r ? C.sage : C.textLt, fontSize: 12, fontWeight: role === r ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{r}</button>))}</div></div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={() => {
            const errs: string[] = [];
            if (!name.trim()) errs.push("ФИО обязательно");
            if (!email.trim()) errs.push("Email обязателен");
            if (!initial && !password.trim()) errs.push("Пароль обязателен");
            if (errs.length) { alert(errs.join("\n")); return; }
            onSave({ name: name.trim(), email: email.trim(), role, password: password || undefined });
          }} style={saveBtnStyle}>Сохранить</button>
          <button onClick={onClose} style={cancelBtnStyle}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirmation dialog ────────────────────────────── */
function ConfirmDialog({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)", padding: "28px 28px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textDk, margin: "0 0 10px" }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.textLt, margin: "0 0 24px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ ...saveBtnStyle, background: confirmColor }}>Удалить</button>
          <button onClick={onCancel} style={cancelBtnStyle}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared primitives ─────────────────────────────── */
function TableToolbar({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.warm}`, display: "flex", justifyContent: "flex-end" }}>{children}</div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: C.textDk, fontSize: 12, whiteSpace: "nowrap" }}>{children}</th>;
}
function Tr({ children, i }: { children: React.ReactNode; i: number }) {
  const [hov, setHov] = useState(false);
  return <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background: hov ? C.beige30 : i % 2 === 0 ? C.surface : C.ivory50, transition: "background 0.1s", borderBottom: `1px solid ${C.ivory}` }}>{children}</tr>;
}
function Td({ children, bold, mono, color }: { children?: React.ReactNode; bold?: boolean; mono?: boolean; color?: string }) {
  return <td style={{ padding: "11px 14px", color: color ?? C.textDk, fontWeight: bold ? 600 : 400, fontVariantNumeric: mono ? "tabular-nums" : undefined, whiteSpace: "nowrap" }}>{children}</td>;
}
function ActiveBadge() {
  return <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: C.sage, color: C.surface }}>Активен</span>;
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>{children}</label>;
}
function ErrSpan({ children }: { children: string }) {
  return <span style={{ fontSize: 11, color: "var(--tm-danger)", marginTop: 4, display: "block" }}>{children}</span>;
}
function ActionBtns({ onEdit, onDel }: { onEdit: () => void; onDel: () => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <IconBtn title="Редактировать" hoverColor={C.sage} onClick={onEdit}><Pencil size={14} /></IconBtn>
      <IconBtn title="Удалить" hoverColor={C.danger} onClick={onDel}><Trash2 size={14} /></IconBtn>
    </div>
  );
}
function IconBtn({ children, title, hoverColor, onClick }: { children: React.ReactNode; title: string; hoverColor: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background: "none", border: "none", cursor: "pointer", color: hov ? hoverColor : C.olive, padding: 2, display: "flex", borderRadius: 4, transition: "color 0.15s" }}>{children}</button>;
}
function Dash() {
  return <span style={{ fontSize: 12, color: C.textLt }}>—</span>;
}

const addBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" };
const saveBtnStyle: React.CSSProperties = { padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" };
const cancelBtnStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "Inter, sans-serif" };
const modalStyle: React.CSSProperties = { width: 480, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)", display: "flex", flexDirection: "column" };
const closeBtnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex", padding: 4, borderRadius: 4 };
