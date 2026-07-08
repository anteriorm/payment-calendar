export type ApprovalStageStatus = "pending" | "active" | "approved" | "rejected" | "skipped";

export interface ApprovalStageInfo {
  id:           number;
  order:        number;
  stageName:    string;
  role:         "initiator" | "manager" | "treasurer" | "director";
  assignee:     string;
  status:       ApprovalStageStatus;
  actionDate?:  string;
  comment?:     string;
}

export interface ApprovalRoute {
  id:          number;
  name:        string;
  description: string;
  autoThreshold?: number;
  stageTemplates: {
    order:     number;
    stageName: string;
    role:      ApprovalStageInfo["role"];
    assignee:  string;
  }[];
}

export const mockApprovalRoutes: ApprovalRoute[] = [
  {
    id: 1,
    name: "Стандартный",
    description: "Руководитель → Казначей",
    stageTemplates: [
      { order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Елена В." },
      { order: 2, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров Иван А."  },
    ],
  },
  {
    id: 2,
    name: "Ускоренный",
    description: "Только Казначей",
    autoThreshold: 0,
    stageTemplates: [
      { order: 1, stageName: "Утверждение казначеем", role: "treasurer", assignee: "Петров Иван А." },
    ],
  },
];

export interface PaymentApproval {
  paymentId: number;
  routeId:   number;
  stages:    ApprovalStageInfo[];
}

export const mockApprovals: PaymentApproval[] = [];
