/**
 * AuditScreen — Журнал действий (только для Admin).
 * Данные загружаются из GET /api/audit.
 */

import { useState, useEffect, type CSSProperties } from "react";
import { Search, ChevronDown, Download } from "lucide-react";
import { C } from "../tokens";
import { exportCsv } from "../utils";
import { useToast } from "./Toast";
import * as api from "../../api";

interface AuditEntry {
  id:        number;
  timestamp: string;
  user_name: string;
  user_role: string;
  action:    string;
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
  income_confirmed:   { label: "Поступление подтв.",    bg: C.sage10,         color: "#3D6B3D" },
  income_received:    { label: "Поступление получено",  bg: C.sage10,         color: "#3D6B3D" },
  income_canceled:    { label: "Поступление отменено",  bg: C.danger15,       color: "#8B2020" },
  account_created:    { label: "Счёт создан",           bg: C.ivory,          color: C.textLt  },
  account_updated:    { label: "Счёт обновлён",         bg: C.ivory,          color: C.textLt  },
  account_deleted:    { label: "Счёт удалён",           bg: C.danger15,       color: "#8B2020" },
  counterparty_created: { label: "Контрагент создан",   bg: C.ivory,          color: C.textLt  },
  counterparty_updated: { label: "Контрагент обновлён", bg: C.ivory,         color: C.textLt  },
  counterparty_deleted: { label: "Контрагент удалён",   bg: C.danger15,      color: "#8B2020" },
  item_created:       { label: "Статья создана",        bg: C.ivory,          color: C.textLt  },
  item_updated:       { label: "Статья обновлена",      bg: C.ivory,          color: C.textLt  },
  item_deleted:       { label: "Статья удалена",        bg: C.danger15,       color: "#8B2020" },
  user_created:       { label: "Пользователь создан",   bg: C.danger12,       color: "#8B2020" },
  user_updated:       { label: "Пользователь обновлён", bg: C.ivory,          color: C.textLt  },
  user_deleted:       { label: "Пользователь удалён",   bg: C.danger15,       color: "#8B2020" },
  user_login:         { label: "Вход в систему",        bg: C.ivory,          color: C.textLt  },
  import_payments:    { label: "Импорт заявок",         bg: C.olive20,        color: "#555540" },
  import_incomes:     { label: "Импорт поступлений",    bg: C.olive20,        color: "#555540" },
};

const ACTION_OPTIONS = [
  { value: "", label: "Все действия" },
  { value: "payment_created",      label: "Заявка создана"        },
  { value: "payment_submitted",    label: "Отправлена"             },
  { value: "payment_approved",     label: "Согласована"            },
  { value: "payment_rejected",     label: "Отклонена"              },
  { value: "payment_moved",        label: "Перенесена дата"        },
  { value: "income_created",       label: "Поступление"            },
  { value: "income_confirmed",     label: "Поступление подтв."     },
  { value: "income_received",      label: "Поступление получено"   },
  { value: "income_canceled",      label: "Поступление отменено"   },
  { value: "registry_created",     label: "Реестр создан"          },
  { value: "registry_paid",        label: "Реестр оплачен"         },
  { value: "account_created",      label: "Счёт создан"            },
  { value: "account_updated",      label: "Счёт обновлён"          },
  { value: "account_deleted",      label: "Счёт удалён"            },
  { value: "counterparty_created", label: "Контрагент создан"      },
  { value: "counterparty_updated", label: "Контрагент обновлён"    },
  { value: "counterparty_deleted", label: "Контрагент удалён"      },
  { value: "item_created",         label: "Статья создана"         },
  { value: "item_updated",         label: "Статья обновлена"       },
  { value: "item_deleted",         label: "Статья удалена"         },
  { value: "user_created",         label: "Пользователь создан"    },
  { value: "user_updated",         label: "Пользователь обновлён"  },
  { value: "user_deleted",         label: "Пользователь удалён"    },
  { value: "user_login",           label: "Вход в систему"         },
  { value: "import_payments",      label: "Импорт заявок"          },
  { value: "import_incomes",       label: "Импорт поступлений"     },
];

export function AuditScreen() {
  const { showToast } = useToast();
  const [searchObj, setSearchObj] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [hovered,   setHovered]   = useState<number | null>(null);
  const [entries,   setEntries]   = useState<AuditEntry[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.audit.getAll({ from: dateFrom || undefined, to: dateTo || undefined, action: filterAction || undefined })
      .then((data: any) => {
        const items = Array.isArray(data) ? data : (data.data ?? []);
        setEntries(items);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, filterAction]);

  const filtered = entries.filter(e => {
    if (searchObj && !e.object.toLowerCase().includes(searchObj.toLowerCase()) &&
                    !(e.details ?? "").toLowerCase().includes(searchObj.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    exportCsv(
      "Аудит_действий.csv",
      ["#", "Дата и время", "Пользователь", "Роль", "Действие", "Объект", "Детали"],
      filtered.map(e => [e.id, e.timestamp, e.user_name, e.user_role, ACTION_LABELS[e.action]?.label ?? e.action, e.object, e.details]),
    );
    showToast("Аудит_действий.csv скачан", "success");
  };

  const selStyle: CSSProperties = {
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
    <div style={{ padding: 28, fontFamily: "Inter, sans-serif", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textDk, margin: 0 }}>Журнал действий</h1>
          <p style={{ fontSize: 12, color: C.textLt, margin: "3px 0 0" }}>История операций в системе</p>
        </div>
        <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          <Download size={14} /> Экспорт CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLt }} />
          <input placeholder="Поиск по объекту…" value={searchObj} onChange={e => setSearchObj(e.target.value)}
            style={{ width: 210, padding: "7px 10px 7px 30px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>

        <div style={{ position: "relative" }}>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ ...selStyle, width: 170 }}>
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.textLt, pointerEvents: "none" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, color: C.textLt }}>с</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <span style={{ fontSize: 12, color: C.textLt }}>по</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>

        <button onClick={() => { setSearchObj(""); setFilterAction(""); setDateFrom(""); setDateTo(""); }}
          style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.warm}`, borderRadius: 6, color: C.textLt, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          Сбросить
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textLt }}>Загрузка…</div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 10, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 150px 100px 180px minmax(150px, 1fr) 1fr", background: C.ivory50, borderBottom: `1px solid ${C.warm}` }}>
            {["Дата и время", "Пользователь", "Роль", "Действие", "Объект", "Детали"].map(col => (
              <div key={col} style={{ padding: "9px 12px", fontWeight: 600, color: C.textDk, fontSize: 12 }}>{col}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: C.textLt, fontSize: 13 }}>Нет записей</div>
          )}
          {filtered.map((e, i) => {
            const isHov = hovered === e.id;
            const bg = isHov ? C.beige30 : i % 2 === 0 ? C.surface : C.ivory50;
            const al = ACTION_LABELS[e.action] ?? { label: e.action, bg: C.ivory, color: C.textLt };
            return (
              <div key={e.id}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ display: "grid", gridTemplateColumns: "160px 150px 100px 180px minmax(150px, 1fr) 1fr", background: bg, transition: "background 0.1s", borderBottom: `1px solid rgba(0,0,0,0.05)` }}>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{e.timestamp}</div>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textDk, fontWeight: 500 }}>{e.user_name}</div>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt }}>{e.user_role}</div>
                <div style={{ padding: "9px 12px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: al.bg, color: al.color, whiteSpace: "nowrap" }}>{al.label}</span>
                </div>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textDk }}>{e.object}</div>
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.textLt }}>{e.details}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
