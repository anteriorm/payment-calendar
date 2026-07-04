import { useState, type ReactNode } from "react";
import { Check, X, Clock, ChevronRight, UserCheck, AlertTriangle, SkipForward } from "lucide-react";
import { C } from "../tokens";
import type { ApprovalStageInfo, ApprovalRoute } from "../../api";

type ApprovalStageStatus = ApprovalStageInfo["status"];

const STAGE_CFG: Record<ApprovalStageStatus, {
  icon:    () => ReactNode;
  bg:      string;
  border:  string;
  color:   string;
  label:   string;
}> = {
  approved: { icon: () => <Check size={13} strokeWidth={2.5} />, bg: C.sage,     border: C.sage,   color: C.surface, label: "Согласовано" },
  active:   { icon: () => <Clock size={13} strokeWidth={2} />,   bg: C.surface,  border: C.sage,   color: C.sage,    label: "Ожидает действия" },
  pending:  { icon: () => <Clock size={12} strokeWidth={1.5} />, bg: C.ivory,    border: C.warm,   color: C.textLt,  label: "Ожидает очереди" },
  rejected: { icon: () => <X     size={13} strokeWidth={2.5} />, bg: C.danger,   border: C.danger, color: C.surface, label: "Отклонено" },
  skipped:  { icon: () => <SkipForward size={12} />,             bg: C.ivory,    border: C.warm,   color: C.textLt,  label: "Пропущен" },
};

const ROLE_LABEL: Record<ApprovalStageInfo["role"], string> = {
  initiator: "Инициатор",
  manager:   "Руководитель",
  treasurer: "Казначей",
  director:  "Директор",
};

interface ApprovalStepperProps {
  stages:       ApprovalStageInfo[];
  route?:       ApprovalRoute;
  /** ID текущего пользователя — для отображения кнопок действий */
  currentRole?: ApprovalStageInfo["role"];
  paymentId?:   number;
  onApprove?:   (stageId: number, comment: string) => Promise<void>;
  onReject?:    (stageId: number, comment: string) => Promise<void>;
  compact?:     boolean;
}

export function ApprovalStepper({
  stages,
  route,
  currentRole,
  paymentId,
  onApprove,
  onReject,
  compact = false,
}: ApprovalStepperProps) {
  const [actionStageId, setActionStageId] = useState<number | null>(null);
  const [actionType,    setActionType]    = useState<"approve" | "reject" | null>(null);
  const [comment,       setComment]       = useState("");
  const [loading,       setLoading]       = useState(false);

  if (stages.length === 0) {
    return (
      <div style={{ padding: "12px 14px", background: C.ivory50, borderRadius: 8, border: `1px solid ${C.warm}`, fontSize: 12, color: C.textLt }}>
        Маршрут согласования не выбран. Заявка ещё не отправлена.
      </div>
    );
  }

  const activeStage = stages.find(s => s.status === "active");
  const isMyStage   = activeStage && currentRole && activeStage.role === currentRole;

  async function handleAction() {
    if (!actionStageId || !actionType) return;
    setLoading(true);
    try {
      if (actionType === "approve") await onApprove?.(actionStageId, comment);
      else                          await onReject?.(actionStageId, comment);
      setActionStageId(null);
      setActionType(null);
      setComment("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Route name */}
      {route && !compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <UserCheck size={13} color={C.sage} />
          <span style={{ fontSize: 12, color: C.textLt }}>Маршрут:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textDk }}>{route.name}</span>
          <span style={{ fontSize: 11, color: C.textLt }}>— {route.description}</span>
        </div>
      )}

      {/* Stages */}
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 10 }}>
        {stages.map((stage, idx) => {
          const cfg = STAGE_CFG[stage.status];
          const isLast = idx === stages.length - 1;
          const isAction = actionStageId === stage.id;

          return (
            <div key={stage.id}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>

                {/* Icon + line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: compact ? 22 : 26,
                    height: compact ? 22 : 26,
                    borderRadius: "50%",
                    background: cfg.bg,
                    border: `2px solid ${cfg.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: cfg.color,
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}>
                    {cfg.icon()}
                  </div>
                  {!isLast && (
                    <div style={{ width: 2, flex: 1, minHeight: 14, background: stage.status === "approved" ? C.sage : C.warm, margin: "3px 0" }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: compact ? 0 : 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: compact ? 12 : 13,
                      fontWeight: stage.status === "active" ? 600 : 500,
                      color: stage.status === "rejected" ? C.danger : stage.status === "active" ? C.textDk : C.textLt,
                    }}>
                      {stage.stageName}
                    </span>
                    <span style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 500,
                      background: stage.status === "approved" ? C.sage10 : stage.status === "rejected" ? C.danger12 : stage.status === "active" ? C.olive20 : C.ivory,
                      color: stage.status === "approved" ? "#3D6B3D" : stage.status === "rejected" ? C.danger : stage.status === "active" ? "#555540" : C.textLt,
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: C.textLt, marginTop: 2 }}>
                    <span style={{ fontWeight: 500 }}>{ROLE_LABEL[stage.role]}</span>
                    {" · "}
                    {stage.assignee}
                    {stage.actionDate && <span style={{ marginLeft: 6 }}>· {stage.actionDate}</span>}
                  </div>

                  {stage.comment && !compact && (
                    <div style={{ marginTop: 4, padding: "4px 8px", background: stage.status === "rejected" ? C.danger08 : C.ivory50, borderRadius: 5, fontSize: 11, color: stage.status === "rejected" ? C.danger : C.textLt, borderLeft: `2px solid ${stage.status === "rejected" ? C.danger : C.warm}` }}>
                      {stage.comment}
                    </div>
                  )}

                  {/* Action buttons for active stage */}
                  {!compact && isMyStage && stage.id === activeStage?.id && onApprove && onReject && (
                    <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                      {!isAction ? (
                        <>
                          <button
                            onClick={() => { setActionStageId(stage.id); setActionType("approve"); setComment(""); }}
                            style={{ padding: "5px 12px", borderRadius: 6, background: C.sage, color: C.surface, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 5 }}
                          >
                            <Check size={12} />
                            Согласовать
                          </button>
                          <button
                            onClick={() => { setActionStageId(stage.id); setActionType("reject"); setComment(""); }}
                            style={{ padding: "5px 12px", borderRadius: 6, background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}`, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                          >
                            Отклонить
                          </button>
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                          <textarea
                            autoFocus
                            placeholder={actionType === "approve" ? "Комментарий (необязательно)…" : "Причина отказа…"}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            rows={2}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1.5px solid ${actionType === "approve" ? C.sage : C.danger}`, background: C.surface, fontSize: 12, color: C.textDk, outline: "none", resize: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={handleAction}
                              disabled={loading || (actionType === "reject" && !comment.trim())}
                              style={{
                                padding: "6px 14px", borderRadius: 6,
                                background: actionType === "approve" ? C.sage : C.danger,
                                color: C.surface, border: "none", fontSize: 12, fontWeight: 500,
                                cursor: loading ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif",
                                opacity: loading ? 0.7 : 1,
                                display: "flex", alignItems: "center", gap: 5,
                              }}
                            >
                              {actionType === "approve" ? <Check size={12} /> : <X size={12} />}
                              {loading ? "Отправка…" : actionType === "approve" ? "Подтвердить" : "Отклонить"}
                            </button>
                            <button
                              onClick={() => { setActionStageId(null); setActionType(null); setComment(""); }}
                              style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", color: C.textLt, border: `1px solid ${C.warm}`, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Компактный mini-stepper для строки таблицы: три точки с цветами */
export function MiniStepper({ stages }: { stages: ApprovalStageInfo[] }) {
  if (stages.length === 0) return null;

  const dotColor: Record<ApprovalStageStatus, string> = {
    approved: C.sage,
    active:   C.olive,
    pending:  C.warm,
    rejected: C.danger,
    skipped:  C.ivory,
  };

  const approved = stages.filter(s => s.status === "approved").length;
  const total    = stages.length;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }} title={`Этапов: ${approved}/${total}`}>
      {stages.map(s => (
        <div
          key={s.id}
          title={`${s.stageName}: ${STAGE_CFG[s.status].label}`}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: dotColor[s.status],
            border: s.status === "active" ? `1.5px solid ${C.sage}` : "none",
            flexShrink: 0,
          }}
        />
      ))}
      <span style={{ fontSize: 10, color: C.textLt, marginLeft: 3 }}>{approved}/{total}</span>
    </div>
  );
}
