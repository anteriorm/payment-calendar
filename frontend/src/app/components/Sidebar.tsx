import { type ComponentType } from "react";
import {
  LayoutDashboard, Calendar, ClipboardList, ArrowUpCircle,
  FileText, BarChart2, Settings, LogOut, ShieldCheck, RefreshCw,
} from "lucide-react";
import { C } from "../tokens";
import { useAuth, type Screen } from "../context/AuthContext";

export type { Screen };

interface SidebarProps {
  current:        Screen;
  onChange:       (screen: Screen) => void;
  allowedScreens: Screen[];
}

const ALL_NAV_ITEMS: { id: Screen; Icon: ComponentType<{ size: number }>; label: string; dividerAfter?: boolean }[] = [
  { id: "dashboard",  Icon: LayoutDashboard, label: "Главная",          dividerAfter: true },
  { id: "calendar",   Icon: Calendar,        label: "Календарь"         },
  { id: "requests",   Icon: ClipboardList,   label: "Заявки на платёж"  },
  { id: "recurring",  Icon: RefreshCw,       label: "Повторяющиеся"     },
  { id: "income",     Icon: ArrowUpCircle,   label: "Поступления"       },
  { id: "registry",   Icon: FileText,        label: "Реестр платежей"   },
  { id: "reports",    Icon: BarChart2,       label: "Отчёты"            },
  { id: "references", Icon: Settings,        label: "Справочники"       },
  { id: "audit",      Icon: ShieldCheck,     label: "Аудит действий"    },
];

export function Sidebar({ current, onChange, allowedScreens }: SidebarProps) {
  const { logout } = useAuth();
  const visibleItems = ALL_NAV_ITEMS.filter(item => allowedScreens.includes(item.id));

  return (
    <aside
      style={{
        width: 220,
        background: C.olive,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {visibleItems.map(({ id, Icon, label, dividerAfter }) => {
          const active = id === current;
          return (
            <div key={id}>
              <button
                onClick={() => onChange(id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  background: active ? C.sage : "transparent",
                  border: "none",
                  borderLeft: active ? `3px solid ${C.surface}` : "3px solid transparent",
                  cursor: "pointer",
                  color: active ? C.surface : "rgba(250,250,245,0.85)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: "left",
                  fontFamily: "Inter, sans-serif",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
              {dividerAfter && (
                <div style={{ margin: "4px 20px", height: 1, background: "rgba(250,250,245,0.15)" }} />
              )}
            </div>
          );
        })}

        <div style={{ margin: "8px 20px", height: 1, background: "rgba(250,250,245,0.20)" }} />

        <button
          onClick={logout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            background: "transparent",
            border: "none",
            borderLeft: "3px solid transparent",
            cursor: "pointer",
            color: "rgba(250,250,245,0.55)",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(250,250,245,0.85)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(250,250,245,0.55)")}
        >
          <LogOut size={15} />
          <span>Выйти</span>
        </button>
      </nav>

      <div style={{ padding: "12px 20px", fontSize: 11, color: C.warm }}>
        v2.1.0 · TrueMachine
      </div>
    </aside>
  );
}
