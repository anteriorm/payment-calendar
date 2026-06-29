/**
 * AuditScreen — Журнал действий (только для Admin).
 *
 * STUB: данные статические. При подключении бэкенда замените AUDIT_LOG на:
 *   const { data, loading } = useApi('/api/audit?page=1&per_page=25&...');
 * Фильтры → query params → GET /api/audit?user_id=&action=&from=&to=
 */

import { useState } from "react";
import { Search, ChevronDown, Download } from "lucide-react";
import { C } from "../tokens";
import { exportCsv } from "../utils";
import { useToast } from "./Toast";

type ActionType =
  | "payment_created"    | "payment_submitted"  | "payment_approved"
  | "payment_rejected"   | "payment_moved"       | "registry_created"
  | "registry_paid"      | "income_created"      | "account_updated"
  | "counterparty_added" | "user_login"          | "user_created";

interface AuditEntry {
  id:        number;
  timestamp: string;
  user:      string;
  role:      string;
  action:    ActionType;
  object:    string;
  details:   string;
}

/* ── STUB DATA — replace with GET /api/audit ──────────────── */
const AUDIT_LOG: AuditEntry[] = [
  { id: 15, timestamp: "26.06.2026 15:40", user: "Петров И.А.",   role: "Казначей",      action: "payment_moved",       object: "Заявка № 2847",         details: "Дата: 29.06 → 26.06.2026" },
  { id: 14, timestamp: "26.06.2026 15:00", user: "Петров И.А.",   role: "Казначей",      action: "registry_paid",       object: "Реестр 18.06.2026",      details: "Статус: paid. Сумма: 1 240 000 ₽" },
  { id: 13, timestamp: "26.06.2026 14:30", user: "Петров И.А.",   role: "Казначей",      action: "registry_created",    object: "Реестр 18.06.2026",      details: "5 заявок, общая сумма 1 240 000 ₽" },
  { id: 12, timestamp: "26.06.2026 12:10", user: "Козлова Е.В.",  role: "Руководитель",  action: "payment_approved",    object: "Заявка № 2845",          details: "На согласовании → Согласована" },
  { id: 11, timestamp: "26.06.2026 11:45", user: "Иванова М.С.",  role: "Инициатор",     action: "payment_submitted",   object: "Заявка № 2843",          details: "Черновик → На согласовании" },
  { id: 10, timestamp: "26.06.2026 11:42", user: "Иванова М.С.",  role: "Инициатор",     action: "payment_created",     object: "Заявка № 2843",          details: "Сумма: 85 000 ₽, ООО ТехСервис" },
  { id: 9,  timestamp: "25.06.2026 16:20", user: "Иванова М.С.",  role: "Инициатор",     action: "income_created",      object: "Поступление № 2301",     details: "280 000 ₽ от ООО Альфа-Трейд" },
  { id: 8,  timestamp: "25.06.2026 09:00", user: "Иванова М.С.",  role: "Инициатор",     action: "user_login",          object: "—",                      details: "IP: 192.168.1.10" },
  { id: 7,  timestamp: "24.06.2026 17:30", user: "Козлова Е.В.",  role: "Руководитель",  action: "payment_rejected",    object: "Заявка № 2835",          details: "Причина: неверные реквизиты" },
  { id: 6,  timestamp: "24.06.2026 14:00", user: "Петров И.А.",   role: "Казначей",      action: "registry_paid",       object: "Реестр 17.06.2026",      details: "Все платежи проведены" },
  { id: 5,  timestamp: "23.06.2026 11:00", user: "Сидоров А.К.",  role: "Администратор", action: "account_updated",     object: "Расчётный счёт №1",      details: "Начальный остаток: 500 000 ₽" },
  { id: 4,  timestamp: "23.06.2026 10:30", user: "Сидоров А.К.",  role: "Администратор", action: "counterparty_added",  object: "ООО РентаГрупп",         details: "ИНН: 7904567890, тип: Юр. лицо" },
  { id: 3,  timestamp: "23.06.2026 09:50", user: "Сидоров А.К.",  role: "Администратор", action: "user_created",        object: "Иванова М.С.",           details: "Роль: Инициатор, email: m.ivanova@..." },
  { id: 2,  timestamp: "23.06.2026 08:45", user: "Петров И.А.",   role: "Казначей",      action: "user_login",          object: "—",                      details: "IP: 10.0.0.5" },
  { id: 1,  timestamp: "23.06.2026 08:00", user: "Сидоров А.К.",  role: "Администратор", action: "user_login",          object: "—",                      details: "IP: 10.0.0.1 — первый вход" },
];

const ACTION_LABELS: Record<ActionType, { label: string; bg: string; color: string }> = {
  payment_created:    { label: "Заявка создана",       bg: C.ivory,          color: C.textLt  },
  payment_submitted:  { label: "Отправлена",            bg: C.olive20,        color: "#555540" },
  payment_approved:   { label: "Согласована",           bg: C.sage10,         color: "#3D6B3D" },
  payment_rejected:   { label: "Отклонена",             bg: C.danger15,       color: "#8B2020" },
  payment_moved:      { label: "Перенесена дата",       bg: C.beige30,        color: "#7A5A30" },
  registry_created:   { label: "Реестр создан",         bg: C.olive20,        color: "#555540" },
  registry_paid:      { label: "Реестр оплачен",        bg: C.sage10,         color: "#3D6B3D" },
  income_created:     { label: "Поступление",           bg: C.sage10,         color: "#3D6B3D" },
  account_updated:    { label: "Счёт обновлён",         bg: C.ivory,          color: C.textLt  },
  counterparty_added: { label: "Контрагент добавлен",   bg: C.ivory,          color: C.textLt  },
  user_login:         { label: "Вход в систему",        bg: C.ivory,          color: C.textLt  },
  user_created:       { label: "Пользователь создан",   bg: C.danger12,       color: "#8B2020" },
};
/* ──────────────────────────────────────────────────────────── */

const ACTION_OPTIONS = [
  { value: "", label: "Все действия" },
  { value: "payment_created",   label: "Заявка создана"        },
  { value: "payment_submitted", label: "Отправлена"             },
  { value: "payment_approved",  label: "Согласована"            },
  { value: "payment_rejected",  label: "Отклонена"              },
  { value: "registry_created",  label: "Реестр создан"          },
  { value: "registry_paid",     label: "Реестр оплачен"         },
  { value: "user_login",        label: "Вход в систему"         },
];

const USERS_OPTIONS = [
  { value: "", label: "Все пользователи" },
  { value: "Петров И.А.",   label: "Петров И.А. (Казначей)"      },
  { value: "Козлова Е.В.",  label: "Козлова Е.В. (Руководитель)" },
  { value: "Иванова М.С.",  label: "Иванова М.С. (Инициатор)"    },
  { value: "Сидоров А.К.",  label: "Сидоров А.К. (Администратор)"},
];

export function AuditScreen() {
  const { showToast } = useToast();
  const [searchObj, setSearchObj] = useState("");
  const [filterUser,   setFilterUser]   = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [hovered,   setHovered]   = useState<number | null>(null);

  const filtered = AUDIT_LOG.filter(e => {
    if (searchObj    && !e.object.toLowerCase().includes(searchObj.toLowerCase()) &&
                        !e.details.toLowerCase().includes(searchObj.toLowerCase())) return false;
    if (filterUser   && e.user !== filterUser)    return false;
    if (filterAction && e.action !== filterAction) return false;
    return true;
  });

  const handleExport = () => {
    exportCsv(
      "Аудит_действий.csv",
      ["#", "Дата и время", "Пользователь", "Роль", "Действие", "Объект", "Детали"],
      filtered.map(e => [e.id, e.timestamp, e.user, e.role, ACTION_LABELS[e.action].label, e.object, e.details]),
    );
    showToast("Аудит_действий.csv скачан", "success");
  };

  const selStyle: React.CSSProperties = {
    padding: "7px 26px 7px 10px",
    border: `1px solid ${C.warm}`,
    borderRadius: 6,
    background: C.surface,
    fontSize: 13,
    color: C.textDk,
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>

      {/* Filter bar */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.warm}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}>
            <Search size={14} />
          </div>
          <input
            placeholder="Поиск по объекту, деталям…"
            value={searchObj}
            onChange={e => setSearchObj(e.target.value)}
            style={{ width: 220, padding: "7px 10px 7px 30px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }}
          />
        </div>

        {/* User filter */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ ...selStyle, width: 230 }}>
            {USERS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}><ChevronDown size={13} /></div>
        </div>

        {/* Action filter */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ ...selStyle, width: 175 }}>
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}><ChevronDown size={13} /></div>
        </div>

        {/* Date range */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.textLt }}>с</span>
          <input type="text" placeholder="дд.мм.гггг" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ width: 96, padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <span style={{ fontSize: 12, color: C.textLt }}>по</span>
          <input type="text" placeholder="дд.мм.гггг" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ width: 96, padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>

        {(searchObj || filterUser || filterAction || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearchObj(""); setFilterUser(""); setFilterAction(""); setDateFrom(""); setDateTo(""); }}
            style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${C.warm}`, borderRadius: 6, color: C.textLt, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}
          >
            Сбросить
          </button>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.textLt, flexShrink: 0 }}>
          {filtered.length} записей
        </span>
        <button
          onClick={handleExport}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}
        >
          <Download size={14} />
          Экспорт CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)", minWidth: 900 }}>

          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "44px 140px 1fr 180px 160px 1fr", background: C.hdr, borderBottom: `1px solid ${C.warm}` }}>
            {["#", "Дата и время", "Пользователь", "Действие", "Объект", "Детали"].map((col, i) => (
              <div key={col} style={{ padding: `10px ${i === 3 ? "20px" : "12px"} 10px 12px`, fontSize: 12, fontWeight: 600, color: C.textDk }}>
                {col}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: C.textLt, fontSize: 13 }}>
              Нет записей по заданным фильтрам
            </div>
          )}

          {filtered.map((entry, idx) => {
            const ac = ACTION_LABELS[entry.action];
            const isHov = hovered === entry.id;
            const bg = isHov
              ? C.beige30
              : idx % 2 === 0 ? C.surface : C.ivory50;
            return (
              <div
                key={entry.id}
                onMouseEnter={() => setHovered(entry.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ display: "grid", gridTemplateColumns: "44px 140px 1fr 180px 160px 1fr", background: bg, borderBottom: `1px solid rgba(192,192,160,0.35)`, transition: "background 0.1s" }}
              >
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{entry.id}</div>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt, whiteSpace: "nowrap" }}>{entry.timestamp}</div>
                <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.textDk }}>{entry.user}</span>
                  <span style={{ fontSize: 11, color: C.textLt }}>{entry.role}</span>
                </div>
                <div style={{ padding: "9px 20px 9px 12px", display: "flex", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: ac.bg, color: ac.color, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ac.label}
                  </span>
                </div>
                <div style={{ padding: "9px 12px 9px 0", fontSize: 12, color: C.textDk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.object}</div>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt }}>{entry.details}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
