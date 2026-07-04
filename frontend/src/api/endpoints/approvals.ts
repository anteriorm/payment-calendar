/**
 * approvalsService — маршруты и этапы согласования.
 *
 * Бэкенд должен реализовать:
 *   GET  /api/approval-routes                        → ApprovalRoute[]
 *   GET  /api/payments/{id}/approval                 → PaymentApproval
 *   POST /api/payments/{id}/approval/start           → PaymentApproval (запуск маршрута)
 *   POST /api/payments/{id}/approval/stages/{stageId}/approve → ApprovalStageInfo
 *   POST /api/payments/{id}/approval/stages/{stageId}/reject  → ApprovalStageInfo
 */

import client from "../client";
import { delay, randomId } from "../mocks/handlers";
import {
  mockApprovalRoutes,
  mockApprovals,
  type ApprovalRoute,
  type PaymentApproval,
  type ApprovalStageInfo,
} from "../mocks/data/approvals";
import { USE_MOCK } from "../../config";

let routeStore: ApprovalRoute[]    = [...mockApprovalRoutes];
let approvalStore: PaymentApproval[] = mockApprovals.map(a => ({
  ...a,
  stages: a.stages.map(s => ({ ...s })),
}));

const real = {
  getRoutes:       ()                                          => client.get<ApprovalRoute[]>("/approval-routes").then(r => r.data),
  getAllApprovals:  ()                                          => client.get<PaymentApproval[]>("/approvals").then(r => r.data),
  getApproval:     (paymentId: number)                         => client.get<PaymentApproval>(`/payments/${paymentId}/approval`).then(r => r.data),
  startRoute:      (paymentId: number, routeId: number)        => client.post<PaymentApproval>(`/payments/${paymentId}/approval/start`, { routeId }).then(r => r.data),
  approveStage: (paymentId: number, stageId: number, comment?: string) =>
    client.post<ApprovalStageInfo>(`/payments/${paymentId}/approval/stages/${stageId}/approve`, { comment }).then(r => r.data),
  rejectStage:  (paymentId: number, stageId: number, comment: string) =>
    client.post<ApprovalStageInfo>(`/payments/${paymentId}/approval/stages/${stageId}/reject`, { comment }).then(r => r.data),
};

const mock = {
  getRoutes:      () => delay([...routeStore]),
  getAllApprovals: () => delay(approvalStore.map(a => ({ ...a, stages: [...a.stages] }))),

  getApproval: (paymentId: number) => {
    const found = approvalStore.find(a => a.paymentId === paymentId);
    return delay(found ?? { paymentId, routeId: 0, stages: [] });
  },

  startRoute: (paymentId: number, routeId: number) => {
    const route = routeStore.find(r => r.id === routeId);
    if (!route) return delay({ paymentId, routeId: 0, stages: [] });
    const stages: ApprovalStageInfo[] = route.stageTemplates.map((t, i) => ({
      id:        randomId() + i,
      order:     t.order,
      stageName: t.stageName,
      role:      t.role,
      assignee:  t.assignee,
      status:    i === 0 ? "active" : "pending",
    }));
    const approval: PaymentApproval = { paymentId, routeId, stages };
    approvalStore = approvalStore.filter(a => a.paymentId !== paymentId);
    approvalStore.push(approval);
    return delay(approval);
  },

  approveStage: (paymentId: number, stageId: number, comment = "") => {
    const approval = approvalStore.find(a => a.paymentId === paymentId);
    if (!approval) return delay(null as unknown as ApprovalStageInfo);
    const stamp = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    approval.stages = approval.stages.map(s => {
      if (s.id === stageId) return { ...s, status: "approved", actionDate: stamp, comment };
      if (s.status === "pending" && !approval.stages.find(x => x.order === s.order - 1 && x.status !== "approved")) {
        return { ...s, status: "active" };
      }
      return s;
    });
    // Activate next pending stage
    const approvedIdx = approval.stages.findIndex(s => s.id === stageId);
    if (approvedIdx >= 0 && approvedIdx + 1 < approval.stages.length) {
      approval.stages[approvedIdx + 1] = { ...approval.stages[approvedIdx + 1], status: "active" };
    }
    return delay(approval.stages.find(s => s.id === stageId)!);
  },

  rejectStage: (paymentId: number, stageId: number, comment: string) => {
    const approval = approvalStore.find(a => a.paymentId === paymentId);
    if (!approval) return delay(null as unknown as ApprovalStageInfo);
    const stamp = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    approval.stages = approval.stages.map(s => {
      if (s.id === stageId) return { ...s, status: "rejected", actionDate: stamp, comment };
      if (s.status === "pending" || s.status === "active") return { ...s, status: "skipped" };
      return s;
    });
    return delay(approval.stages.find(s => s.id === stageId)!);
  },
};

export const approvalsService = USE_MOCK ? mock : real;
export type { ApprovalRoute, PaymentApproval, ApprovalStageInfo };
