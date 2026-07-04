import { useState, useEffect } from "react";
import { Search, ChevronDown, Edit2, Send, Trash2, FolderOpen, Upload, X, FileDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableSkeleton, TableError } from "./TableSkeleton";
import * as api from "../../api";
import { C } from "../tokens";
import { useToast } from "./Toast";
import { CreateRequestModal, type ModalRequestData } from "./CreateRequestModal";
import { exportCsv, rubToKopecks, kopecksToRub, formatRubFromRub } from "../utils";

// ============= ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ (определены ДО использования) =============

function DropFilter({ value, onChange, placeholder, options, width }: any) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <select value={String(value)} onChange={e => onChange(e.target.value)}
        style={{ width, padding: "7px 26px 7px 10px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: value ? C.textDk : C.textLt, outline: "none", appearance: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
        <option value="">{placeholder}</option>
        {options.map((o: any) => <option key={o.value} value={String(o.value)}>{String(o.label)}</option>)}
      </select>
      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textLt, display: "flex" }}>
        <ChevronDown size={13} />
      </div>
    </div>
  );
}

function CheckBox({ checked, onChange }: any) {
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

function IconBtn({ children, title, hoverColor, onClick }: any) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "none", border: "none", cursor: "pointer", color: hov ? hoverColor : C.olive, padding: 3, display: "flex", borderRadius: 4, transition: "color 0.15s" }}>
      {children}
    </button>
  );
}

function PageBtn({ label, active, disabled, onClick }: any) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ width: 32, height: 32, borderRadius: 6, border: "none", background: active ? C.sage : C.ivory, color: active ? C.surface : disabled ? C.warm : C.textLt, fontSize: 13, fontWeight: active ? 600 : 400, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", transition: "background 0.15s" }}>
      {label}
    </button>
  );
}

function DeleteConfirmDialog({ id, onConfirm, onCancel }: any) {
  return (
    <div onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, fontFamily: "Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 400, background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 12, padding: "28px 28px 20px", boxShadow: "0 4px 24px rgba(44,44,30,0.18)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDk, margin: "0 0 8px" }}>Удалить заявку № {id}?</h3>
        <p style={{ fontSize: 13, color: C.textLt, margin: "0 0 24px", lineHeight: 1.5 }}>Это действие нельзя отменить. Заявка будет удалена безвозвратно.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 6, background: C.danger, color: C.surface, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Удалить</button>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.warm}`, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImport }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [idBase] = useState(() => Date.now());

  const readFile = (f: File) => {
    setFile(f);
    setParsed(null);
    setError("");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const rows = text.split("\n").slice(1).filter(l => l.trim()).map((line, i) => {
          const cols = line.split(";").map(c => c.replace(/"/g, "").trim());
          return {
            id: idBase + i + 1,
            counterparty: cols[0] || "—",
            article: cols[1] || "—",
            purpose: cols[2] || "—",
            amount: parseFloat(cols[3]?.replace(/[₽\s]/g, "").replace(",", ".")) || 0,
            date: cols[4] || "01.07.2026",
            account: cols[5] || "Расчётный №1",
            priority: "medium",
            status: "draft",
          };
        }).filter(r => r.counterparty !== "—" || r.amount > 0);
        if (rows.length === 0) setError("Не удалось распознать строки.");
        else setParsed(rows);
      } catch { setError("Ошибка чтения файла."); }
    };
    reader.readAsText(f, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) readFile(f); };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) readFile(f); };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:C.overlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, fontFamily:"Inter, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: parsed ? 680 : 480, maxHeight:"88vh", background:C.surface, border:`1px solid ${C.warm}`, borderRadius:12, overflow:"hidden", boxShadow:"0 4px 24px rgba(44,44,30,0.18)", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 24px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${C.warm}`, flexShrink:0 }}>
          <div><h2 style={{ fontSize:16, fontWeight:600, color:C.textDk, margin:0 }}>Импорт из CSV</h2></div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.textLt, padding:4, display:"flex" }}><X size={18} /></button>
        </div>
        <div style={{ padding:"20px 24px", overflowY:"auto", flex:1 }}>
          {!parsed && (
            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => document.getElementById("csv-input")?.click()}
              style={{ border:`2px dashed ${C.warm}`, borderRadius:8, padding:"32px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:10, background:C.ivory, cursor:"pointer" }}>
              <Upload size={28} color={C.warm} />
              <span style={{ fontSize:14, fontWeight:500, color:C.textDk }}>{file ? file.name : "Перетащите .csv файл сюда"}</span>
              <span style={{ fontSize:12, color:C.textLt }}>{file ? "Разбираю файл…" : "или нажмите для выбора"}</span>
            </div>
          )}
          {parsed && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:C.sage10, borderRadius:6, border:`1px solid ${C.sage}`, marginBottom:12 }}>
                <span style={{ fontSize:13, color:C.sage, fontWeight:600 }}>✓ {file?.name}</span>
                <span style={{ fontSize:12, color:C.textLt }}>распознано {parsed.length} заявок</span>
                <button onClick={() => { setFile(null); setParsed(null); }} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.warm}`, borderRadius:4, padding:"2px 8px", fontSize:11, color:C.textLt, cursor:"pointer" }}>Другой файл</button>
              </div>
              <div style={{ border:`1px solid ${C.warm}`, borderRadius:8, overflow:"hidden", maxHeight:300, overflowY:"auto" }}>
                <div style={{ display:"grid", gridTemplateColumns:"50px 1fr 110px 90px 90px 90px", background:C.hdr, position:"sticky", top:0 }}>
                  {["№","Контрагент","Статья","Сумма","Дата","Счёт"].map(h => <div key={h} style={{ padding:"8px 10px", fontSize:11, fontWeight:600, color:C.textDk }}>{h}</div>)}
                </div>
                {parsed.map((r, i) => (
                  <div key={r.id} style={{ display:"grid", gridTemplateColumns:"50px 1fr 110px 90px 90px 90px", background:i%2===0?C.surface:C.ivory50, borderBottom:`1px solid rgba(192,192,160,0.3)` }}>
                    <div style={{ padding:"7px 10px", fontSize:12, color:C.textLt }}>{i+1}</div>
                    <div style={{ padding:"7px 10px", fontSize:12, color:C.textDk, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.counterparty}</div>
                    <div style={{ padding:"7px 10px", fontSize:12, color:C.textLt, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.article}</div>
                    <div style={{ padding:"7px 10px", fontSize:12, color:C.textDk, fontVariantNumeric:"tabular-nums" }}>{ruFmt(r.amount)} ₽</div>
                    <div style={{ padding:"7px 10px", fontSize:12, color:C.textLt }}>{r.date}</div>
                    <div style={{ padding:"7px 10px", fontSize:12, color:C.textLt, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.account}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <div style={{ padding:"12px 14px", background:"rgba(192,80,74,0.08)", border:`1px solid ${C.danger}`, borderRadius:6, fontSize:12, color:"#8B2020" }}>{error}</div>}
        </div>
        <div style={{ borderTop:`1px solid ${C.warm}`, padding:"14px 24px", display:"flex", gap:10, flexShrink:0 }}>
          <button disabled={!parsed} onClick={() => parsed && onImport(parsed)}
            style={{ padding:"9px 20px", borderRadius:6, background:parsed ? C.sage : C.warm, color:C.surface, border:"none", fontSize:13, fontWeight:500, cursor:parsed ? "pointer" : "not-allowed", fontFamily:"Inter, sans-serif" }}>
            Импортировать {parsed ? `(${parsed.length})` : ""}
          </button>
          <button onClick={onClose} style={{ padding:"9px 14px", borderRadius:6, background:"transparent", color:C.olive, border:`1.5px solid ${C.warm}`, fontSize:13, cursor:"pointer" }}>Отмена</button>
          <input id="csv-input" type="file" accept=".csv" hidden onChange={handleInput} />
        </div>
      </div>
    </div>
  );
}

function ruFmt(n: number): string {
  const s = Math.floor(Math.abs(n)).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ");
}

// ---------- ОСНОВНОЙ КОМПОНЕНТ ----------
type Status   = "draft" | "pending" | "approved" | "inRegistry" | "paid" | "rejected";
type Priority = "high" | "medium" | "low";

interface Request {
  id:           number;
  counterparty: string;
  article:      string;
  purpose:      string;
  amount:       number;
  date:         string;
  account:      string;
  priority:     Priority;
  status:       Status;
}

const STATUS_CFG: Record<Status, { bg: string; color: string; label: string }> = {
  draft:      { ...C.badge.draft,      label: "Черновик"        },
  pending:    { ...C.badge.pending,    label: "На согласовании" },
  approved:   { ...C.badge.approved,   label: "Согласована"     },
  inRegistry: { ...C.badge.inRegistry, label: "В реестре"       },
  paid:       { ...C.badge.paid,       label: "Оплачена"        },
  rejected:   { ...C.badge.rejected,   label: "Отклонена"       },
};

const PRIORITY_CFG: Record<Priority, { dot: string; label: string; border?: boolean }> = {
  high:   { dot: C.danger, label: "Высокий"               },
  medium: { dot: C.beige,  label: "Средний", border: true },
  low:    { dot: C.sage,   label: "Низкий"                },
};

const COLS = "40px 56px 1fr 110px 130px 110px 88px 110px 88px 130px 90px";
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<Status, number> = {
  draft:      0,
  pending:    1,
  approved:   2,
  inRegistry: 3,
  paid:       4,
  rejected:   5,
};

function toModalData(req: Request): ModalRequestData {
  return {
    id:           req.id,
    amount:       String(req.amount),
    date:         String(req.date),
    account:      String(req.account),
    counterparty: String(req.counterparty),
    article:      String(req.article),
    purpose:      String(req.purpose),
    priority:     req.priority,
  };
}

interface PaymentRequestsProps {
  onCreateRequest?: () => void;
}

const PAGE_SIZE = 8;

function mapApiToRequest(p: any): Request {
  // Извлекаем дату и обрезаем до YYYY-MM-DD
  const rawDate = p.planned_date ?? p.date ?? "";
  const cleanDate = rawDate.split('T')[0]; // берём только часть до T
  const date = cleanDate.split("-").reverse().join("."); // преобразуем в ДД.ММ.ГГГГ

  const counterpartyName = p.counterparty?.name ?? p.counterparty ?? "";
  const itemName = p.item?.name ?? p.item ?? "";
  const accountName = p.account?.name ?? p.account ?? "";
  const purpose = p.purpose ?? "";

  const rawStatus = p.status ?? "draft";
  const status = rawStatus === "in_registry" ? "inRegistry" : rawStatus;

  return {
    id: p.id,
    counterparty: String(counterpartyName),
    article: String(itemName),
    purpose: String(purpose),
    amount: kopecksToRub(p.amount ?? 0),
    date,
    account: String(accountName),
    priority: p.priority ?? "medium",
    status: status as Status,
  };
}

export function PaymentRequests({ onCreateRequest }: PaymentRequestsProps) {
  const { showToast } = useToast();

  const [rows,          setRows]          = useState<Request[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [statusF,       setStatusF]       = useState("");
  const [accountF,      setAccountF]      = useState("");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [hovered,       setHovered]       = useState<number | null>(null);
  const [selected,      setSelected]      = useState<Set<number>>(new Set());
  const [activePage,    setActivePage]    = useState(1);
  const [sortKey,       setSortKey]       = useState<keyof Request | null>(null);
  const [sortDir,       setSortDir]       = useState<"asc" | "desc">("asc");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRequest,     setEditRequest]     = useState<Request | null>(null);
  const [deleteRequest,   setDeleteRequest]   = useState<Request | null>(null);
  const [showImport,      setShowImport]      = useState(false);

  // ----- Загрузка справочников -----
  const [accounts, setAccounts] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [acc, cp, it] = await Promise.all([
          api.accounts.getAll(),
          api.counterparties.getAll(),
          api.items.getAll(),
        ]);
        setAccounts(acc);
        setCounterparties(cp);
        setItems(it);
      } catch (e) {
        console.error('Не удалось загрузить справочники', e);
      }
    };
    loadRefs();
  }, []);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    api.payments.getAll()
      .then(data => {
        const mapped = (data as unknown[]).map(p => mapApiToRequest(p));
        setRows(mapped);
      })
      .catch((err) => {
        console.error('Ошибка загрузки:', err);
        setLoadError("Не удалось загрузить заявки");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setActivePage(1); }, [search, statusF, accountF, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch(""); setStatusF(""); setAccountF(""); setDateFrom(""); setDateTo("");
  };

  const toggleSort = (key: keyof Request) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = rows.filter(r => {
    if (search   && !r.counterparty.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusF  && r.status  !== statusF)  return false;
    if (accountF && r.account !== accountF) return false;
    return true;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let cmp: number;
        if (sortKey === "priority") {
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
        } else if (sortKey === "status") {
          cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        } else {
          cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "ru", { numeric: true });
        }
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  const allSelected = selected.size === paged.length && paged.length > 0;
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(paged.map(r => r.id)));
  const toggleRow   = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSaveRequest = async (data: ModalRequestData, asDraft: boolean) => {
    const amountInKopecks = rubToKopecks(Number(data.amount) || 0);
    const account = accounts.find(a => a.name === data.account);
    const counterparty = counterparties.find(c => c.name === data.counterparty);
    const item = items.find(i => i.name === data.article);

    if (!account || !counterparty || !item) {
      showToast('Не найдены счёт, контрагент или статья', 'error');
      return;
    }

    // Преобразуем дату из ДД.ММ.ГГГГ → ГГГГ-ММ-ДД
    const [day, month, year] = data.date.split('.');
    const plannedDate = `${year}-${month}-${day}`;

    const payload = {
      amount: amountInKopecks,
      planned_date: plannedDate,
      account_id: account.id,
      counterparty_id: counterparty.id,
      item_id: item.id,
      purpose: data.purpose || '',
      priority: data.priority || 'medium',
    };

    try {
      if (data.id) {
        await api.payments.update(data.id, payload);
        showToast('Заявка обновлена', 'success');
      } else {
        await api.payments.create(payload);
        showToast(asDraft ? 'Черновик сохранён' : 'Заявка отправлена на согласование', 'success');
      }
      setShowCreateModal(false);
      setEditRequest(null);
      loadData();
    } catch (err: any) {
      console.error('❌ Ошибка при сохранении:', err);
      // Пытаемся извлечь сообщение от сервера
      const message = err?.response?.data?.message || err?.message || 'Ошибка при сохранении';
      showToast(message, 'error');
    }
  };

  const handleSend = async (id: number) => {
  try {
    await api.payments.submit(id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: "pending" } : r));
    showToast("Заявка отправлена на согласование", "success");
    loadData(); // обновить список
  } catch (err) {
    console.error(err);
    showToast('Ошибка при отправке', 'error');
  }
};

  const handleDeleteConfirm = async () => {
  if (!deleteRequest) return;
  try {
    await api.payments.delete(deleteRequest.id);
    setRows(prev => prev.filter(r => r.id !== deleteRequest.id));
    showToast(`Заявка № ${deleteRequest.id} удалена`, "success");
    setDeleteRequest(null);
    loadData(); // перезагрузить список (можно и не обязательно, т.к. мы уже удалили локально)
  } catch (err) {
    console.error(err);
    showToast('Ошибка при удалении', 'error');
  }
};

  // ===== ДОБАВЛЕНА ФУНКЦИЯ ЭКСПОРТА =====
  const handleExport = () => {
    const toExport = selected.size > 0
      ? filtered.filter(r => selected.has(r.id))
      : filtered;
    exportCsv(
      "Заявки_на_платёж.csv",
      ["№", "Контрагент", "Статья", "Назначение", "Сумма", "Дата", "Счёт", "Приоритет", "Статус"],
      toExport.map(r => [
        r.id,
        r.counterparty,
        r.article,
        r.purpose,
        formatRubFromRub(r.amount),
        r.date,
        r.account,
        PRIORITY_CFG[r.priority].label,
        STATUS_CFG[r.status].label,
      ]),
    );
    showToast(`Заявки_на_платёж.csv скачан (${toExport.length} строк)`, "success");
  };

  // ======================================

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.warm}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.warm, display: "flex", pointerEvents: "none" }}>
              <Search size={14} />
            </div>
            <input placeholder="Поиск по контрагенту…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 210, padding: "7px 10px 7px 30px", border: `1px solid ${C.warm}`, borderRadius: 6, background: C.surface, fontSize: 13, color: C.textDk, outline: "none", fontFamily: "Inter, sans-serif" }} />
          </div>

          <DropFilter value={statusF} onChange={setStatusF} placeholder="Статус" width={155}
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

          <button onClick={clearFilters} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.warm}`, borderRadius: 6, color: C.textLt, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
            Сбросить фильтры
          </button>

          <div style={{ flex: 1 }} />

          {onCreateRequest !== undefined && (
            <button onClick={() => setShowCreateModal(true)}
              style={{ padding: "7px 16px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
              Создать заявку
            </button>
          )}
          <button onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
            <FileDown size={14} />
            Выгрузить в CSV
          </button>
          <button onClick={() => setShowImport(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "transparent", color: C.olive, border: `1.5px solid ${C.olive}`, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
            <FolderOpen size={14} />
            Импорт из Excel
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 24px 0" }}>
          <div style={{ background: C.surface, border: `1px solid ${C.warm}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(44,44,30,0.08)", minWidth: 1100 }}>
            <div style={{ display: "grid", gridTemplateColumns: COLS, background: C.hdr, borderBottom: `1px solid ${C.warm}` }}>
              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
                <CheckBox checked={allSelected} onChange={toggleAll} />
              </div>
              {(["№", "counterparty", "article", "purpose", "amount", "date", "account", "priority", "status", ""] as const).map((col, i) => {
                const labels: Record<string, string> = { counterparty: "Контрагент", article: "Статья", purpose: "Назначение", amount: "Сумма", date: "Дата", account: "Счёт", priority: "Приоритет", status: "Статус" };
                const label = col === "№" ? "№" : col === "" ? "Действия" : labels[col] ?? col;
                const sortable = !!col && col !== "№" && col !== "";
                const active = sortKey === col;
                return (
                  <div key={i} onClick={sortable ? () => toggleSort(col as keyof Request) : undefined}
                    style={{ padding: "10px 10px", fontSize: 12, fontWeight: 600, color: C.textDk, display: "flex", alignItems: "center", gap: 4, cursor: sortable ? "pointer" : "default", userSelect: "none" }}>
                    {label}
                    {sortable && (active
                      ? (sortDir === "asc" ? <ArrowUp size={11} color={C.sage} /> : <ArrowDown size={11} color={C.sage} />)
                      : <ArrowUpDown size={11} color={C.warm} />)}
                  </div>
                );
              })}
            </div>

            {loading && <TableSkeleton rows={PAGE_SIZE} cols={COLS} />}
            {!loading && loadError && <TableError message={loadError} onRetry={loadData} />}
            {!loading && !loadError && paged.map((req, idx) => {
              const isHov   = hovered === req.id;
              const isSel   = selected.has(req.id);
              const bg      = isSel ? C.sage10 : isHov ? C.beige30 : (idx % 2 === 0 ? C.surface : C.ivory50);
              const sc      = STATUS_CFG[req.status];
              const pc      = PRIORITY_CFG[req.priority];
              const isDraft = req.status === "draft";

              return (
                <div key={req.id}
                  onMouseEnter={() => setHovered(req.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ display: "grid", gridTemplateColumns: COLS, background: bg, borderBottom: `1px solid rgba(192,192,160,0.40)`, transition: "background 0.1s" }}>
                  <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
                    <CheckBox checked={isSel} onChange={() => toggleRow(req.id)} />
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, fontVariantNumeric: "tabular-nums" }}>{String(req.id)}</div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 13, color: C.textDk, fontWeight: 500, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(req.counterparty)}</span>
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(req.article)}</span>
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(req.purpose)}</span>
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: C.textDk, whiteSpace: "nowrap" }}>
                    {formatRubFromRub(req.amount)}
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, whiteSpace: "nowrap" }}>{String(req.date)}</div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", fontSize: 12, color: C.textLt, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(req.account)}</span>
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: pc.dot, flexShrink: 0, border: pc.border ? "1px solid #C0A070" : undefined }} />
                    <span style={{ fontSize: 12, color: C.textLt, whiteSpace: "nowrap" }}>{pc.label}</span>
                  </div>
                  <div style={{ padding: "10px 10px", display: "flex", alignItems: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ padding: "10px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                    <IconBtn title="Редактировать" hoverColor={C.sage} onClick={() => setEditRequest(req)}>
                      <Edit2 size={14} />
                    </IconBtn>
                    {isDraft && (
                      <IconBtn title="Отправить на согласование" hoverColor={C.sage} onClick={() => handleSend(req.id)}>
                        <Send size={14} />
                      </IconBtn>
                    )}
                    {isDraft && (
                      <IconBtn title="Удалить" hoverColor={C.danger} onClick={() => setDeleteRequest(req)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    )}
                  </div>
                </div>
              );
            })}

            {!loading && !loadError && sorted.length === 0 && (
              <div style={{ padding: "32px", textAlign: "center", color: C.textLt, fontSize: 13 }}>
                Нет заявок по выбранным фильтрам
              </div>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div style={{ margin: "0 24px 12px", padding: "10px 16px", background: C.ivory, border: `1px solid ${C.warm}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: C.textDk, fontWeight: 500 }}>
              Выбрано: {selected.size} {selected.size === 1 ? "заявка" : selected.size < 5 ? "заявки" : "заявок"}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => {
                const draftIds = filtered.filter(r => r.status === "draft" && selected.has(r.id)).map(r => r.id);
                if (draftIds.length) {
                  handleSend(draftIds[0]);
                }
                setSelected(new Set());
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              <Send size={13} />
              Отправить на согласование
            </button>
            <button
              onClick={() => setSelected(new Set())}
              style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: C.textLt, border: `1px solid ${C.warm}`, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              Снять выбор
            </button>
          </div>
        )}

        <div style={{ padding: "10px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.textLt }}>
            {sorted.length > 0 ? `Показано ${(activePage-1)*PAGE_SIZE+1}–${Math.min(activePage*PAGE_SIZE, sorted.length)} из ${sorted.length}` : ""}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PageBtn label="←" active={false} disabled={activePage <= 1}         onClick={() => setActivePage(p => Math.max(1, p - 1))} />
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push("…");
                acc.push(p); return acc;
              }, [])
              .map((p, i) => p === "…"
                ? <span key={`e-${i}`} style={{ padding: "0 6px", color: C.textLt, fontSize: 13, lineHeight: "32px" }}>…</span>
                : <PageBtn key={p} label={String(p)} active={activePage === p} onClick={() => setActivePage(p as number)} />
              )
            }
            <PageBtn label="→" active={false} disabled={activePage >= totalPages} onClick={() => setActivePage(p => Math.min(totalPages, p + 1))} />
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateRequestModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveRequest}
          accounts={accounts}
          counterparties={counterparties}
          items={items}
        />
      )}

      {editRequest && (
        <CreateRequestModal
          initialData={toModalData(editRequest)}
          onClose={() => setEditRequest(null)}
          onSave={handleSaveRequest}
          accounts={accounts}
          counterparties={counterparties}
          items={items}
        />
      )}

      {deleteRequest && <DeleteConfirmDialog id={deleteRequest.id} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteRequest(null)} />}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={imported => {
            setRows(prev => [...imported, ...prev]);
            showToast(`Импортировано ${imported.length} заявок`, "success");
            setShowImport(false);
          }}
        />
      )}
    </>
  );
}