import { useState, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { PaymentCalendar, type SelectedCell } from "./components/PaymentCalendar";
import { CreateRequestModal } from "./components/CreateRequestModal";
import { RequestDrawer } from "./components/RequestDrawer";
import { PaymentRegistry } from "./components/PaymentRegistry";
import { References } from "./components/References";
import { PaymentRequests } from "./components/PaymentRequests";
import { Income } from "./components/Income";
import { Reports } from "./components/Reports";
import { DashboardScreen } from "./components/DashboardScreen";
import { AuditScreen } from "./components/AuditScreen";
import { ToastProvider } from "./components/Toast";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileModal } from "./components/ProfileModal";
import { SettingsModal } from "./components/SettingsModal";
import { AuthProvider, useAuth, ROLE_SCREENS, type Screen } from "./context/AuthContext";

const SCREEN_TITLES: Record<Screen, string> = {
  dashboard:  "Главная",
  calendar:   "Платёжный календарь",
  requests:   "Заявки на платёж",
  income:     "Поступления",
  registry:   "Реестр платежей",
  reports:    "Отчёты",
  references: "Справочники",
  audit:      "Аудит действий",
};

function AppShell() {
  const { isAuthed, initializing, user, perms } = useAuth();

  const [screen,            setScreen]            = useState<Screen>("dashboard");
  const [showModal,         setShowModal]          = useState(false);
  const [showDrawer,        setShowDrawer]         = useState(false);
  const [drawerCell,        setDrawerCell]         = useState<SelectedCell | null>(null);
  const [showProfile,       setShowProfile]        = useState(false);
  const [showSettings,      setShowSettings]       = useState(false);
  const [paidConfirmations, setPaidConfirmations]  = useState<{ dateStr: string; amount: number }[]>([]);

  const rescheduleRef = useRef<((from: string, to: string, amount: number, accKey?: string) => void) | null>(null);

  // If role changes and current screen is not allowed → redirect to first allowed screen
  const allowedScreens = user ? ROLE_SCREENS[user.role] : [];
  const currentScreen  = allowedScreens.includes(screen) ? screen : (allowedScreens[0] ?? "calendar");

  const handleScreenChange = (s: Screen) => {
    if (allowedScreens.includes(s)) { setScreen(s); setShowDrawer(false); }
  };

  if (initializing) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "#555540" }}>
        Загрузка…
      </div>
    );
  }

  if (!isAuthed) return <LoginScreen />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Inter, sans-serif", minWidth: 900 }}>
      <TopBar
        title={SCREEN_TITLES[currentScreen]}
        onOpenProfile={() => setShowProfile(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar current={currentScreen} onChange={handleScreenChange} allowedScreens={allowedScreens} />

        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#FFFFFF", position: "relative" }}>

          {currentScreen === "dashboard" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <DashboardScreen />
            </div>
          )}

          {currentScreen === "audit" && (
            <AuditScreen />
          )}

          {currentScreen === "calendar" && (
            <PaymentCalendar
              onCreateRequest={perms.canCreateRequest ? () => setShowModal(true) : undefined}
              onSelectRequest={(cell) => { setDrawerCell(cell); setShowDrawer(true); }}
              onGoToRegistry={perms.canFormRegistry ? () => setScreen("registry") : undefined}
              onRescheduleReady={(fn) => { rescheduleRef.current = fn; }}
              paidConfirmations={paidConfirmations}
              canReschedule={perms.canReschedule}
            />
          )}

          {currentScreen === "requests" && (
            <PaymentRequests onCreateRequest={perms.canCreateRequest ? () => setShowModal(true) : undefined} />
          )}

          {currentScreen === "income" && <Income canCreate={perms.canCreateRequest} />}

          {currentScreen === "registry" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <PaymentRegistry
                onAddRequest={perms.canCreateRequest ? () => setShowModal(true) : undefined}
                onPaymentsPaid={perms.canMarkPaid
                  ? items => setPaidConfirmations(prev => [...prev, ...items])
                  : undefined}
                canMarkPaid={perms.canMarkPaid}
              />
            </div>
          )}

          {currentScreen === "references" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <References canManage={perms.canManageRefs} />
            </div>
          )}

          {currentScreen === "reports" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <Reports onGoToCalendar={() => setScreen("calendar")} />
            </div>
          )}

          {showDrawer && (
            <RequestDrawer
              onClose={() => { setShowDrawer(false); setDrawerCell(null); }}
              isCashGap={drawerCell?.isCashGap}
              deficitAmount={drawerCell?.deficitAmount}
              paymentAccKey={drawerCell?.accKey ?? "acc1"}
              onReschedule={perms.canReschedule
                ? (from, to, amount, accKey) => rescheduleRef.current?.(from, to, amount, accKey)
                : undefined}
              canApprove={perms.canApprove}
            />
          )}
        </main>
      </div>

      {showModal && <CreateRequestModal onClose={() => setShowModal(false)} />}
      {showProfile  && <ProfileModal  onClose={() => setShowProfile(false)}  />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </DndProvider>
  );
}
