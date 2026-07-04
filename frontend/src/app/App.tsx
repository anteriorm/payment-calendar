import { useState, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { PaymentCalendar, type SelectedCell } from "./components/PaymentCalendar";
import { CreateRequestModal, type ModalRequestData } from "./components/CreateRequestModal";
import { RequestDrawer } from "./components/RequestDrawer";
import { PaymentRegistry } from "./components/PaymentRegistry";
import { References } from "./components/References";
import { PaymentRequests } from "./components/PaymentRequests";
import { Income } from "./components/Income";
import { Reports } from "./components/Reports";
import { DashboardScreen } from "./components/DashboardScreen";
import { AuditScreen } from "./components/AuditScreen";
import { RecurringPayments } from "./components/RecurringPayments";
import { ToastProvider, useToast } from "./components/Toast";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileModal } from "./components/ProfileModal";
import { SettingsModal } from "./components/SettingsModal";
import { AuthProvider, useAuth, ROLE_SCREENS, type Screen } from "./context/AuthContext";
import * as api from "../api";

const SCREEN_TITLES: Record<Screen, string> = {
  dashboard:  "Главная",
  calendar:   "Платёжный календарь",
  requests:   "Заявки на платёж",
  recurring:  "Повторяющиеся платежи",
  income:     "Поступления",
  registry:   "Реестр платежей",
  reports:    "Отчёты",
  references: "Справочники",
  audit:      "Аудит действий",
};

function AppShell() {
  const { isAuthed, user, perms } = useAuth();
  const { showToast } = useToast();

  const [screen,            setScreen]            = useState<Screen>("dashboard");
  const [showModal,         setShowModal]          = useState(false);
  const [showDrawer,        setShowDrawer]         = useState(false);
  const [drawerCell,        setDrawerCell]         = useState<SelectedCell | null>(null);
  const [drawerPaymentId,   setDrawerPaymentId]    = useState<number>(2847);
  const [showProfile,       setShowProfile]        = useState(false);
  const [showSettings,      setShowSettings]       = useState(false);
  const [paidConfirmations,   setPaidConfirmations]  = useState<{ dateStr: string; amount: number }[]>([]);
  const [requestsRefreshKey,  setRequestsRefreshKey]  = useState(0);

  const rescheduleRef = useRef<((from: string, to: string, amount: number, accKey?: string) => void) | null>(null);

  // When a new request is created via the global modal: persist to API store + start route
  async function handleCreateRequestSave(data: ModalRequestData, asDraft: boolean) {
    setShowModal(false);
    try {
      // Create the payment in the mock payments store
      const created = await api.payments.create({
        planned_date:     data.date ?? "2026-07-02",
        account_id:       1,
        account_name:     data.account ?? "Расчётный №1",
        counterparty_id:  1,
        counterparty:     data.counterparty ?? "",
        item_id:          1,
        item:             data.article ?? "",
        amount:           Math.round(parseFloat((data.amount ?? "0").replace(/\s/g, "").replace(",", ".")) * 100),
        priority:         (data.priority ?? "medium") as "high" | "medium" | "low",
        purpose:          data.purpose ?? "",
        created_by:       "Иванова М.С.",
        created_at:       new Date().toISOString(),
      } as any);

      // Start approval route if sending (not draft) and route selected
      if (!asDraft && data.routeId && (created as any)?.id) {
        await api.approvals.startRoute((created as any).id, data.routeId);
        const route = await api.approvals.getRoutes();
        const routeName = (route as any[]).find(r => r.id === data.routeId)?.name ?? "Стандартный";
        showToast(`Заявка создана. Маршрут «${routeName}» запущен`, "success");
      } else {
        showToast(asDraft ? "Черновик сохранён" : "Заявка создана", asDraft ? "warning" : "success");
      }
    } catch {
      showToast("Ошибка при создании заявки", "error");
    }
    // Trigger reload in PaymentRequests so the new payment appears
    setRequestsRefreshKey(k => k + 1);
  }

  // If role changes and current screen is not allowed → redirect to first allowed screen
  const allowedScreens = user ? ROLE_SCREENS[user.role] : [];
  const currentScreen  = allowedScreens.includes(screen) ? screen : (allowedScreens[0] ?? "calendar");

  const handleScreenChange = (s: Screen) => {
    if (allowedScreens.includes(s)) { setScreen(s); setShowDrawer(false); }
  };

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
              onSelectRequest={(cell) => { setDrawerCell(cell); setDrawerPaymentId(2847); setShowDrawer(true); }}
              onGoToRegistry={perms.canFormRegistry ? () => setScreen("registry") : undefined}
              onRescheduleReady={(fn) => { rescheduleRef.current = fn; }}
              paidConfirmations={paidConfirmations}
              canReschedule={perms.canReschedule}
            />
          )}

          {currentScreen === "requests" && (
            <PaymentRequests
              onCreateRequest={perms.canCreateRequest ? () => setShowModal(true) : undefined}
              refreshKey={requestsRefreshKey}
              onOpenDetails={(paymentId) => {
                setDrawerPaymentId(paymentId);
                setDrawerCell(null);
                setShowDrawer(true);
              }}
            />
          )}

          {currentScreen === "recurring" && (
            <RecurringPayments
              canCreate={perms.canCreateRequest}
              canOperate={perms.canCreateRequest || perms.canReschedule}
            />
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
              initialPaymentDate={drawerCell?.clickedDateStr}
              initialExpense={drawerCell?.cellExpense}
              onReschedule={perms.canReschedule
                ? (from, to, amount, accKey) => rescheduleRef.current?.(from, to, amount, accKey)
                : undefined}
              canApprove={perms.canApprove}
              paymentId={drawerPaymentId}
              onApprovalChanged={() => setRequestsRefreshKey(k => k + 1)}
            />
          )}
        </main>
      </div>

      {showModal && <CreateRequestModal onClose={() => setShowModal(false)} onSave={handleCreateRequestSave} />}
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
