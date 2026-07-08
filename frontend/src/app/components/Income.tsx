import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { TableSkeleton, TableError } from "./TableSkeleton";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as api from "../../api";
import { Search, ChevronDown, Edit2, Trash2, FolderOpen, X, BarChart2, CheckCircle, ThumbsUp } from "lucide-react";
import { C } from "../tokens";
import { useToast } from "./Toast";
import { exportCsv, kopecksToRub, rubToKopecks, formatRubFromRub, getAccountCurrency, formatAmount, registerAccountCurrency } from "../utils";
import { required, positiveAmount, dateRu } from "../utils/validation";

type IncomeStatus = "planned" | "confirmed" | "received";

type IncomePriority = "high" | "medium" | "low";

interface IncomeRow {
  id:           number;
  counterparty: string;
  article:      string;
  purpose:      string;
  amount:       number;
  date:         string;
  account:      string;
  status:       IncomeStatus;
  priority:     IncomePriority;
}

const STATUS_CFG: Record<IncomeStatus, { bg: string; color: string; label: string }> = {
  planned:   { ...C.badge.planned,   label: "Плановое"     },
  confirmed: { ...C.badge.confirmed, label: "Подтверждено" },
  received:  { ...C.badge.received,  label: "Получено"     },
};

const COLS = "40px 56px minmax(100px,1fr) 120px 130px 120px 82px 100px 80px 120px 110px";

/** Плановое → Подтверждено → Получено (по жизненному циклу поступления) */
const INCOME_STATUS_ORDER: Record<IncomeStatus, number> = {
  planned:   0,
  confirmed: 1,
  received:  2,
};

function ruFmt(n: number): string {
  const s = Math.floor(n).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ");
}

/** Конвертация суммы из валюты счёта в RUB */
function toRub(amount: number, accountName: string, rates: Record<string, number>): number {
  const cur = getAccountCurrency(accountName);
  if (cur === "RUB") return amount;
  return amount * (rates[cur] ?? 1);
}

interface IncomeProps {
  onCreateIncome?: () => void;
  canCreate?:      boolean;
  /** Вызывается после создания/обновления поступления — триггер обновления календаря */
  onCreated?:      () => void;
}

const PAGE_SIZE_INC = 8;

/** Маппер API-формата → внутренний формат компонента */
function mapApiToIncome(i: Record<string, unknown>): IncomeRow {
  const rawDate = (i.planned_date ?? i.date ?? "") as string;
  const date = rawDate.includes(".")
    ? rawDate
    : rawDate.split("-").reverse().join(".");
  return {
    id:           i.id as number,
    counterparty: (i.counterparty ?? "") as string,
    article:      ((i.item ?? i.article) ?? "") as string,
    purpose:      (i.purpose ?? "") as string,
    amount:       kopecksToRub((i.amount ?? 0) as number),
    date,
    account:      ((i.account_name ?? i.account) ?? "") as string,
    status:       ((i.status) ?? "planned") as IncomeStatus,
    priority:     ((i.priority) ?? "medium") as IncomePriority,
  };
}

export function Income({ onCreateIncome, canCreate = true, onCreated }: IncomeProps) {
  const { showToast } = useToast();
  const [rows,       setRows]       = useState<IncomeRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [sortKey,    setSortKey]    = useState<keyof IncomeRow | null>(null);
  const [sortDir,    setSortDir]    = useState<"asc"|"desc">("asc");
  const [search,     setSearch]     = useState("");
  const [statusF,    setStatusF]    = useState("");
  const [accountF,   setAccountF]   = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [hovered,    setHovered]    = useState<number | null>(null);
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [activePage, setActivePage] = useState(1);

  const [editTarget, setEditTarget] = useState<IncomeRow | null>(null);
  const [delTarget,  setDelTarget]  = useState<IncomeRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // ----- Загрузка справочников -----
  const [accounts, setAccounts] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ RUB: 1 });

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [acc, cp, it, cur] = await Promise.all([
          api.accounts.getAll(),
          api.counterparties.getAll(),
          api.items.getAll(),
          api.currencies.getAll(),
        ]);
        setAccounts(acc);
        setCounterparties(cp);
        setItems(it);
        (acc as any[]).forEach(a => registerAccountCurrency(a.name, a.currency));
        const map: Record<string, number> = { RUB: 1 };
        (cur as any[]).forEach((c: any) => { map[c.code] = c.rate_to_rub; });
        setRates(map);
      } catch (e) {
        console.error('Не удалось загрузить справочники', e);
      }
    };
    loadRefs();
  }, []);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    api.incomes.getAll()
      .then(data => {
        const mapped = (data as unknown[]).map(p => mapApiToIncome(p));
        setRows(mapped);
      })
      .catch((err) => {
        console.error('Ошибка загрузки поступлений:', err);
        setLoadError("Не удалось загрузить поступления");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);
  const toggleSort = (key: keyof IncomeRow) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const clearFilters = () => {
    setSearch(""); setStatusF(""); setAccountF(""); setDateFrom(""); setDateTo("");
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await api.incomes.delete(delTarget.id);
      setRows(prev => prev.filter(r => r.id !== delTarget.id));
      showToast(`Поступление № ${delTarget.id} удалено`, "success");
    } catch { showToast("Ошибка удаления", "error"); }
    setDelTarget(null);
  };

  const handleExportSelected = () => {
    const toExport = selected.size > 0
      ? filtered.filter(r => selected.has(r.id))
      : filtered;
    exportCsv(
      "Поступления.csv",
      ["№", "Контрагент", "Статья", "Назначение", "Сумма", "Дата", "Счёт", "Статус"],
      toExport.map(r => [
        r.id,
        r.counterparty,
        r.article,
        r.purpose,
        formatRubFromRub(r.amount),
        r.date,
        r.account,
        STATUS_CFG[r.status].label,
      ]),
    );
    showToast(`Поступления.csv скачан (${toExport.length} строк)`, "success");
    setSelected(new Set());
  };

  const normalizeAcc = (s: string) => s.replace(/\s*счёт\s*/i, " ").replace(/\s+/g, " ").trim();

  const filtered = rows.filter(r => {
    if (search   && !r.counterparty.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusF  && r.status  !== statusF)  return false;
    if (accountF && normalizeAcc(r.account) !== normalizeAcc(accountF)) return false;
    if (dateFrom) {
      const [d, m, y] = dateFrom.split('.');
      const from = new Date(+y, +m - 1, +d);
      const [rd, rm, ry] = r.date.split('.');
      const rowDate = new Date(+ry, +rm - 1, +rd);
      if (rowDate < from) return false;
    }
    if (dateTo) {
      const [d, m, y] = dateTo.split('.');
      const to = new Date(+y, +m - 1, +d);
      const [rd, rm, ry] = r.date.split('.');
      const rowDate = new Date(+ry, +rm - 1, +rd);
      if (rowDate > to) return false;
    }
    return true;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let cmp: number;
        if (sortKey === "status") {
          // Плановое → Подтверждено → Получено (не по алфавиту)
          cmp = (INCOME_STATUS_ORDER[a.status] ?? 99) - (INCOME_STATUS_ORDER[b.status] ?? 99);
        } else {
          cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "ru", { numeric: true });
        }
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPagesInc = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE_INC));
  const paged = sorted.slice((activePage - 1) * PAGE_SIZE_INC, activePage * PAGE_SIZE_INC);

  const allSelected = selected.size === paged.length && paged.length > 0;
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(paged.map(r => r.id)));
  const toggleRow   = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>

      {/* ── Filter + action bar ── */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.warm}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}>
            <Search size={14} />
          </div>
          <input placeholder="Поиск по контрагенту…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 210, padding: "7px 10px 7px 30px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>

        <DropFilter value={statusF} onChange={setStatusF} placeholder="Статус" width={148}
          options={Object.entries(STATUS_CFG).map(([v, cfg]) => ({ value: v, label: cfg.label }))} />
        <DropFilter value={accountF} onChange={setAccountF} placeholder="Счёт" width={140}
          options={accounts.map(a => ({ value: a.name, label: a.name }))} />

        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.textLt }}>с</span>
          <input type="text" placeholder="дд.мм.гггг" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ width: 96, padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <span style={{ fontSize: 12, color: C.textLt }}>по</span>
          <input type="text" placeholder="дд.мм.гггг" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ width: 96, padding: "7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
        </div>

        <button onClick={clearFilters} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.warm}`, borderRadius: 6, color: C.textLt, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
          Сбросить фильтры
        </button>
        <div style={{ flex: 1 }} />
        {canCreate && (
          <button onClick={() => setShowCreate(true)} style={{ padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
            Создать поступление
          </button>
        )}
        <button onClick={() => setShowImport(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
          <FolderOpen size={14} />
          Импорт из Excel
        </button>
      </div>

      {/* Контекстная панель выбора — объясняет назначение чекбоксов */}
      {selected.size > 0 && (
        <div style={{ background: C.sage10, borderBottom: `1px solid ${C.sage}`, padding: "8px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: C.sage, fontWeight: 500 }}>
            Выбрано: {selected.size} {selected.size === 1 ? "запись" : selected.size < 5 ? "записи" : "записей"}
          </span>
          <button onClick={handleExportSelected} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <BarChart2 size={13} /> Выгрузить в Excel
          </button>
          <button onClick={() => setSelected(new Set())} style={{ padding: "5px 10px", borderRadius: 6, background: "transparent", color: C.textLt, border: `1px solid ${C.warm}`, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Снять выделение
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px 0" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)", minWidth: 980 }}>

          <div style={{ display: "grid", gridTemplateColumns: COLS, background: C.hdr, borderBottom: `1px solid ${C.warm}` }}>
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
              <CheckBox checked={allSelected} onChange={toggleAll} />
            </div>
            {([["№",""], ["counterparty","Контрагент"], ["article","Статья"], ["purpose","Назначение"], ["amount","Сумма ↑"], ["date","Дата"], ["account","Счёт"], ["priority","Приоритет"], ["status","Статус"], ["","Действия"]] as [string,string][]).map(([key, label], i) => {
              const sortable = !!key && key !== "№";
              const active = sortKey === key;
              return (
                <div key={i} onClick={sortable ? () => toggleSort(key as keyof IncomeRow) : undefined}
                  style={{ padding: "10px 10px", fontSize: 12, fontWeight: 600, color: C.textDk, display: "flex", alignItems: "center", gap: 3, cursor: sortable ? "pointer" : "default", userSelect: "none" }}>
                  {label || "№"}
                  {sortable && (active ? (sortDir === "asc" ? <ArrowUp size={11} color={C.sage} /> : <ArrowDown size={11} color={C.sage} />) : <ArrowUpDown size={11} color={C.warm} />)}
                </div>
              );
            })}
          </div>

          {loading && <TableSkeleton rows={PAGE_SIZE_INC} cols={COLS} />}
          {!loading && loadError && <TableError message={loadError} onRetry={loadData} />}
          {!loading && !loadError && paged.map((row, idx) => {
            const isHov = hovered === row.id;
            const isSel = selected.has(row.id);
            const bg    = isSel ? C.sage10 : isHov ? C.beige30 : (idx % 2 === 0 ? C.surface : C.ivory50);
            const sc    = STATUS_CFG[row.status];
            const isPlanned = row.status === "planned";

            return (
              <div
                key={row.id}
                onMouseEnter={() => setHovered(row.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ display: "grid", gridTemplateColumns: COLS, background: bg, borderBottom: `1px solid rgba(192,192,160,0.40)`, transition: "background 0.1s" }}
              >
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
                  <CheckBox checked={isSel} onChange={() => toggleRow(row.id)} />
                </div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{row.id}</div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 13, color: C.textDk, fontWeight: 500, overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.counterparty}</span>
                </div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.article}</span>
                </div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.purpose}</span>
                </div>
                {/* Сумма — зелёная со стрелкой ↑ */}
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 13, color: C.sage, fontWeight: 600 }}>↑</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.sage, fontVariantNumeric: "tabular-nums" }}>{formatAmount(row.amount, getAccountCurrency(row.account))}</span>
                </div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, whiteSpace: "nowrap" }}>{row.date}</div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.account}</span>
                </div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                  {(() => { const pc = INCOME_PRIORITY_CFG[row.priority ?? "medium"]; return (<><span style={{ width: 8, height: 8, borderRadius: "50%", background: pc.dot, flexShrink: 0, border: row.priority === "medium" ? "1px solid #C0A070" : undefined }} /><span style={{ fontSize: 12, color: C.textLt, whiteSpace: "nowrap" }}>{pc.label}</span></>); })()}
                </div>
                <div style={{ padding: "10px 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>
                    {sc.label}
                  </span>
                </div>
                <div style={{ padding: "10px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                  {isPlanned && (
                    <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => setEditTarget(row)}><Edit2 size={14} /></IconBtn>
                  )}
                  {row.status === "planned" && (
                    <IconBtn title="Подтвердить" hoverColor={C.sage} onClick={async () => {
                      try { await api.incomes.markConfirmed(row.id); showToast("Поступление подтверждено", "success"); loadData(); }
                      catch { showToast("Ошибка подтверждения", "error"); }
                    }}><ThumbsUp size={14} /></IconBtn>
                  )}
                  {(row.status === "planned" || row.status === "confirmed") && (
                    <IconBtn title="Отметить как полученное" hoverColor={C.sage} onClick={async () => {
                      try { await api.incomes.markReceived(row.id); showToast("Поступление получено", "success"); loadData(); }
                      catch { showToast("Ошибка", "error"); }
                    }}><CheckCircle size={14} /></IconBtn>
                  )}
                  {isPlanned && <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => setDelTarget(row)}><Trash2 size={14} /></IconBtn>}
                </div>
              </div>
            );
          })}

          {!loading && !loadError && sorted.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: C.textLt, fontSize: 13 }}>
              Нет поступлений по выбранным фильтрам
            </div>
          )}
        </div>

        {/* Summary bar — calculated from actual data, converted to RUB */}
        <div style={{ marginTop: 12, padding: "12px 16px", background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, display: "flex", gap: 32, alignItems: "center" }}>
          <SumCard label="Плановые поступления" value={ruFmt(rows.filter(r => r.status === "planned").reduce((s, r) => s + toRub(r.amount, r.account, rates), 0)) + " ₽"} color={C.textLt} />
          <div style={{ width: 1, height: 28, background: C.warm }} />
          <SumCard label="Подтверждено" value={ruFmt(rows.filter(r => r.status === "confirmed").reduce((s, r) => s + toRub(r.amount, r.account, rates), 0)) + " ₽"} color="#3D6B3D" />
          <div style={{ width: 1, height: 28, background: C.warm }} />
          <SumCard label="Получено" value={ruFmt(rows.filter(r => r.status === "received").reduce((s, r) => s + toRub(r.amount, r.account, rates), 0)) + " ₽"} color={C.sage} />
          <div style={{ width: 1, height: 28, background: C.warm }} />
          <SumCard label="Итого (₽-экв.)" value={ruFmt(rows.reduce((s, r) => s + toRub(r.amount, r.account, rates), 0)) + " ₽"} color={C.textDk} bold />
        </div>
      </div>

      {/* ── Pagination — same layout as PaymentRequests ── */}
      <div style={{ padding: "10px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: C.textLt }}>
          {sorted.length > 0 ? `Показано ${(activePage-1)*PAGE_SIZE_INC+1}–${Math.min(activePage*PAGE_SIZE_INC, sorted.length)} из ${sorted.length}` : ""}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <PagButton label="←" active={false} disabled={activePage <= 1} onClick={() => setActivePage(p => Math.max(1, p-1))} />
          {Array.from({ length: totalPagesInc }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPagesInc || Math.abs(p - activePage) <= 1)
            .reduce<(number|"…")[]>((acc, p, i, arr) => { if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push("…"); acc.push(p); return acc; }, [])
            .map((p, i) => p === "…"
              ? <span key={`e${i}`} style={{ padding:"0 6px", color:C.textLt, fontSize:13, lineHeight:"32px" }}>…</span>
              : <PagButton key={p} label={String(p)} active={activePage===p} onClick={() => setActivePage(p as number)} />
            )}
          <PagButton label="→" active={false} disabled={activePage >= totalPagesInc} onClick={() => setActivePage(p => Math.min(totalPagesInc, p+1))} />
        </div>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <IncomeFormModal
          initial={null}
          counterparties={counterparties}
          items={items}
          accounts={accounts}
          onSave={async data => {
            try {
              const created = await api.incomes.create({
                amount: rubToKopecks(data.amount),
                planned_date: data.date.split('.').reverse().join('-'),
                account_id: accounts.find(a => a.name === data.account)?.id ?? 0,
                counterparty_id: counterparties.find(c => c.name === data.counterparty)?.id ?? 0,
                item_id: items.find(i => i.name === data.article)?.id ?? 0,
                purpose: data.purpose,
                priority: data.priority,
              } as any);
              showToast("Поступление создано", "success");
              loadData();
              onCreated?.();
            } catch { showToast("Ошибка создания", "error"); }
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* ── Edit modal ── */}
      {editTarget && (
        <IncomeFormModal
          initial={editTarget}
          counterparties={counterparties}
          items={items}
          accounts={accounts}
          onSave={async data => {
            try {
              await api.incomes.update(editTarget.id, {
                amount: rubToKopecks(data.amount),
                planned_date: data.date.split('.').reverse().join('-'),
                account_id: accounts.find(a => a.name === data.account)?.id ?? 0,
                counterparty_id: counterparties.find(c => c.name === data.counterparty)?.id ?? 0,
                item_id: items.find(i => i.name === data.article)?.id ?? 0,
                purpose: data.purpose,
                priority: data.priority,
              } as any);
              showToast("Поступление обновлено", "success");
              loadData();
              onCreated?.();
            } catch { showToast("Ошибка обновления", "error"); }
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Delete confirm ── */}
      {delTarget && (
        <IncomeConfirmDelete row={delTarget} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}

      {/* ── Import modal ── */}
      {showImport && (
        <IncomeImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadData(); showToast("Импорт завершён", "success"); }}
        />
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────── */

function DropFilter({ value, onChange, placeholder, options, width }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[]; width: number;
}) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width, padding: "7px 26px 7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: value ? C.textDk : C.textLt, outline: "none", appearance: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
        <ChevronDown size={13} />
      </div>
    </div>
  );
}

function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(); }}
      style={{ width: 16, height: 16, borderRadius: 3, border: checked ? "none" : `1.5px solid ${C.warm}`, background: checked ? C.sage : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke={C.surface} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function IconBtn({ children, title, hoverColor, onClick }: { children: ReactNode; title: string; hoverColor: string; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "none", border: "none", cursor: "pointer", color: hov ? hoverColor : C.olive, padding: 3, display: "flex", borderRadius: 4, transition: "color 0.15s" }}>
      {children}
    </button>
  );
}

/* ── Income form modal ──────────────────────────────── */
type IncomeFormData = Omit<IncomeRow, "id" | "status">;

const INCOME_PRIORITY_CFG: Record<IncomePriority, { dot: string; label: string; accent: string; bg: string }> = {
  high:   { dot: C.danger, label: "Высокий", accent: C.danger,  bg: C.danger08              },
  medium: { dot: C.beige,  label: "Средний", accent: "#7A5A30", bg: "rgba(224,192,160,0.22)" },
  low:    { dot: C.sage,   label: "Низкий",  accent: C.sage,    bg: C.sage10                 },
};

function IncomeFormModal({ initial, onSave, onClose, counterparties, items, accounts }: {
  initial: IncomeRow | null;
  onSave: (data: IncomeFormData) => void;
  onClose: () => void;
  counterparties: any[];
  items: any[];
  accounts: any[];
}) {
  const [counterparty, setCp]      = useState(initial?.counterparty ?? "");
  const [article,      setArt]     = useState(initial?.article      ?? "");
  const [purpose,      setPur]     = useState(initial?.purpose      ?? "");
  const [amount,       setAmt]     = useState(initial ? String(initial.amount) : "");
  const [date,         setDate]    = useState(initial?.date         ?? "26.06.2026");
  const [account,      setAcc]     = useState(initial?.account      ?? "");
  const [priority,     setPriority]= useState<IncomePriority>(initial?.priority ?? "medium");

  const inp: CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.warm}`, fontSize: 14, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
  const [errors, setErrors] = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const cpErr  = required(counterparty, "Укажите контрагента");
    const amtErr = positiveAmount(amount || "0");
    const dtErr  = dateRu(date);
    const accErr = required(account, "Выберите счёт");
    if (cpErr)  e.counterparty = cpErr;
    if (amtErr) e.amount = amtErr;
    if (dtErr)  e.date = dtErr;
    if (accErr) e.account = accErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 520, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textDk }}>{initial ? "Редактировать поступление" : "Новое поступление"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex" }}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><FLabel>Контрагент</FLabel>
              <select value={counterparty} onChange={e => setCp(e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
                <option value="">Выберите контрагента</option>
                {counterparties.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: "0 0 140px" }}><FLabel>Сумма ({getAccountCurrency(account) || "RUB"})</FLabel>
              <div style={{ position: "relative" }}>
                <input value={amount} onChange={e => { setAmt(e.target.value); setErrors(p => ({...p, amount:""})); }} style={{ ...inp, paddingRight: 28, ...(errors.amount ? {border:`1.5px solid ${C.danger}`} : {}) }} placeholder="0" />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.sage, fontSize: 14, fontWeight: 600, pointerEvents: "none" }}>↑</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><FLabel>Статья</FLabel>
              <select value={article} onChange={e => setArt(e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
                <option value="">Выберите статью</option>
                {items.filter((i: any) => i.type === "income").map((i: any) => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
            </div>
            <div style={{ flex: "0 0 130px" }}><FLabel>Дата</FLabel>
              <input value={date} onChange={e => { setDate(e.target.value); setErrors(p => ({...p, date:""})); }} style={{ ...inp, ...(errors.date ? {border:`1.5px solid ${C.danger}`} : {}) }} />
              {errors.date && <span style={{ fontSize: 11, color: C.danger, marginTop: 3, display: "block" }}>{errors.date}</span>}
            </div>
          </div>
          <div><FLabel>Назначение</FLabel><input value={purpose} onChange={e => setPur(e.target.value)} style={inp} placeholder="Назначение платежа" /></div>
          <div><FLabel>Счёт</FLabel>
            <select value={account} onChange={e => setAcc(e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              <option value="">Выберите счёт</option>
              {accounts.map((a: any) => <option key={a.id} value={a.name}>{a.name} ({a.currency})</option>)}
            </select>
          </div>
          <div>
            <FLabel>Приоритет</FLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {(Object.entries(INCOME_PRIORITY_CFG) as [IncomePriority, typeof INCOME_PRIORITY_CFG[IncomePriority]][]).map(([val, cfg]) => {
                const sel = priority === val;
                return (
                  <button key={val} onClick={() => setPriority(val)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: sel ? `2px solid ${cfg.accent}` : `1px solid ${C.warm}`, background: sel ? cfg.bg : C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? cfg.accent : C.textLt, transition: "all 0.15s" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.dot, flexShrink: 0, border: val === "medium" ? "1px solid #C0A070" : undefined }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.warm}`, padding: "14px 24px", display: "flex", gap: 10 }}>
          <button onClick={() => { if (validate()) onSave({ counterparty, article, purpose, amount: parseFloat(amount.replace(/\s/g,"").replace(",",".")) || 0, date, account, priority }); }}
            style={{ padding: "9px 20px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Сохранить
          </button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function FLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: C.textLt, display: "block", marginBottom: 6 }}>{children}</label>;
}

function IncomeConfirmDelete({ row, onConfirm, onCancel }: { row: IncomeRow; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, padding: "28px 28px 20px", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: "0 0 8px" }}>Удалить поступление?</h3>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 6px" }}><strong style={{ color: C.textDk }}>{row.counterparty}</strong></p>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 24px" }}>Запись будет удалена безвозвратно.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 6, background: C.danger, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Удалить</button>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.warm}`, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function PagButton({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ width: 32, height: 32, borderRadius: 6, border: "none", background: active ? C.sage : C.ivory, color: active ? C.surface : disabled ? C.warm : C.textLt, fontSize: 13, fontWeight: active ? 600 : 400, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      {label}
    </button>
  );
}

function SumCard({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: C.textLt }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 600, color, fontVariantNumeric: "tabular-nums" }}>
        ↑ {value}
      </span>
      <span style={{ fontSize: 9, color: C.textLt, opacity: 0.65 }}>RUB-экв.</span>
    </div>
  );
}

/* ── Import Modal ───────────────────────────────────── */
function IncomeImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setErrors([]); }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await api.incomes.import(file);
      if (result.errors?.length) setErrors(result.errors);
      else onImported();
      showToast(result.message ?? "Импорт завершён", "success");
    } catch {
      showToast("Ошибка импорта", "error");
    }
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.warm}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: 0 }}>Импорт поступлений из CSV</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLt, display: "flex" }}><X size={17} /></button>
        </div>
        <div style={{ padding: "18px 24px" }}>
          <p style={{ fontSize: 12, color: C.textLt, marginBottom: 12 }}>Формат: дата;счёт;контрагент;статья;сумма;назначение (разделитель — точка с запятой)</p>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ fontSize: 13, color: C.textDk }} />
          {file && <p style={{ fontSize: 12, color: C.sage, marginTop: 8 }}>Выбран: {file.name}</p>}
          {errors.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: C.danger12, borderRadius: 6, maxHeight: 120, overflow: "auto" }}>
              {errors.map((e, i) => <p key={i} style={{ fontSize: 11, color: C.danger, margin: "2px 0" }}>{e}</p>)}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", display: "flex", gap: 10, borderTop: `1px solid ${C.warm}` }}>
          <button onClick={handleImport} disabled={!file || loading} style={{ padding: "9px 20px", borderRadius: 6, background: file ? C.sage : C.warm, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: file ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif" }}>
            {loading ? "Импорт…" : "Импортировать"}
          </button>
          <button onClick={onClose} style={{ padding: "9px 12px", borderRadius: 6, background: "transparent", color: C.olive, border: "none", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
