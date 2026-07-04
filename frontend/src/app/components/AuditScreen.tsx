import { useState, useEffect } from "react";
import { Search, ChevronDown, Download } from "lucide-react";
import { C } from "../tokens";
import { exportCsv } from "../utils";
import { useToast } from "./Toast";
import * as api from "../../api";

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

const ACTION_LABELS: Record<string, { label: string; bg: string; color: string }> = {
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор", initiator: "Инициатор", manager: "Руководитель", treasurer: "Казначей",
};

export function AuditScreen() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchObj, setSearchObj] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.audit.getAll({ action: filterAction || undefined, from: dateFrom || undefined, to: dateTo || undefined })
      .then(res => {
        const mapped: AuditEntry[] = (res.data || []).map((e: any) => ({
          id: e.id,
          timestamp: e.timestamp,
          user: e.user_name,
          role: ROLE_LABELS[e.user_role] ?? e.user_role,
          action: e.action,
          object: e.object,
          details: e.details,
        }));
        setEntries(mapped);
      })
      .catch(() => showToast("Ошибка загрузки аудита", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterAction, dateFrom, dateTo]);

  const filtered = entries.filter(e => {
    if (searchObj && !e.object.toLowerCase().includes(searchObj.toLowerCase()) &&
                    !e.details.toLowerCase().includes(searchObj.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    exportCsv(
      "Аудит_действий.csv",
      ["#", "Дата и время", "Пользователь", "Роль", "Действие", "Объект", "Детали"],
      filtered.map(e => [e.id, e.timestamp, e.user, e.role, ACTION_LABELS[e.action]?.label ?? e.action, e.object, e.details]),
    );
    showToast("Аудит_действий.csv скачан", "success");
  };

  const selStyle: React.CSSProperties = {
    padding: "7px 26px 7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6,
    background: C.surface, fontSize: 13, color: C.textDk, outline: "none",
    appearance: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.warm}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}><Search size={14} /></div>
          <input placeholder="Поиск по объекту, деталям…" value={searchObj} onChange={e => setSearchObj(e.target.value)}
            style={{ width: 220, padding: "7px 10px 7px 30px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ ...selStyle, width: 175 }}>
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}><ChevronDown size={13} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.textLt }}>с</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 130, padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <span style={{ fontSize: 12, color: C.textLt }}>по</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 130, padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>
        {(searchObj || filterAction || dateFrom || dateTo) && (
          <button onClick={() => { setSearchObj(""); setFilterAction(""); setDateFrom(""); setDateTo(""); }}
            style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${C.warm}`, borderRadius: 6, color: C.textLt, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>Сбросить</button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.textLt, flexShrink: 0 }}>{filtered.length} записей</span>
        <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
          <Download size={14} /> Экспорт CSV
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.textLt }}>Загрузка...</div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)", minWidth: 900 }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 140px 1fr 180px 160px 1fr", background: C.hdr, borderBottom: `1px solid ${C.warm}` }}>
              {["#", "Дата и время", "Пользователь", "Действие", "Объект", "Детали"].map((col, i) => (
                <div key={col} style={{ padding: `10px ${i === 3 ? "20px" : "12px"} 10px 12px`, fontSize: 12, fontWeight: 600, color: C.textDk }}>{col}</div>
              ))}
            </div>
            {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: C.textLt, fontSize: 13 }}>Нет записей</div>}
            {filtered.map((entry, idx) => {
              const ac = ACTION_LABELS[entry.action] ?? { label: entry.action, bg: C.ivory, color: C.textLt };
              const isHov = hovered === entry.id;
              return (
                <div key={entry.id} onMouseEnter={() => setHovered(entry.id)} onMouseLeave={() => setHovered(null)}
                  style={{ display: "grid", gridTemplateColumns: "44px 140px 1fr 180px 160px 1fr", background: isHov ? C.beige30 : idx % 2 === 0 ? C.surface : C.ivory50, borderBottom: `1px solid rgba(192,192,160,0.35)`, transition: "background 0.1s" }}>
                  <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{entry.id}</div>
                  <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt, whiteSpace: "nowrap" }}>{entry.timestamp}</div>
                  <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.textDk }}>{entry.user}</span>
                    <span style={{ fontSize: 11, color: C.textLt }}>{entry.role}</span>
                  </div>
                  <div style={{ padding: "9px 20px 9px 12px", display: "flex", alignItems: "center" }}>
                    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>{ac.label}</span>
                  </div>
                  <div style={{ padding: "9px 12px 9px 0", fontSize: 12, color: C.textDk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.object}</div>
                  <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt }}>{entry.details}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
