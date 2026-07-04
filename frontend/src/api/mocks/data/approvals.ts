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
  autoThreshold?: number;   // apply automatically if amount >= threshold (rubles)
  stageTemplates: {
    order:     number;
    stageName: string;
    role:      ApprovalStageInfo["role"];
    assignee:  string;
  }[];
}

// ── Маршруты согласования ─────────────────────────────────────
export const mockApprovalRoutes: ApprovalRoute[] = [
  {
    id: 1,
    name: "Стандартный",
    description: "Руководитель → Казначей",
    stageTemplates: [
      { order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Е.В." },
      { order: 2, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров И.А."  },
    ],
  },
  {
    id: 2,
    name: "Ускоренный",
    description: "Только Казначей",
    autoThreshold: 0,
    stageTemplates: [
      { order: 1, stageName: "Утверждение казначеем", role: "treasurer", assignee: "Петров И.А." },
    ],
  },
  {
    id: 3,
    name: "Крупная сумма",
    description: "Руководитель → Директор → Казначей",
    autoThreshold: 300000,
    stageTemplates: [
      { order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Е.В."  },
      { order: 2, stageName: "Утверждение директором",     role: "director",  assignee: "Нечаев О.В."   },
      { order: 3, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров И.А."   },
    ],
  },
];

// ── Экземпляры согласования по заявкам ───────────────────────
export interface PaymentApproval {
  paymentId: number;
  routeId:   number;
  stages:    ApprovalStageInfo[];
}

export const mockApprovals: PaymentApproval[] = [
  // 2843 — Черновик: нет этапов
  {
    paymentId: 2843,
    routeId:   0,
    stages:    [],
  },
  // 2844 — На согласовании: этап 1 активен у Руководителя
  {
    paymentId: 2844,
    routeId:   1,
    stages: [
      { id: 1, order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Е.В.", status: "active"  },
      { id: 2, order: 2, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров И.А.",  status: "pending" },
    ],
  },
  // 2845 — Согласована: этап 1 пройден, этап 2 активен у Казначея
  {
    paymentId: 2845,
    routeId:   1,
    stages: [
      { id: 3, order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Е.В.", status: "approved", actionDate: "17.06.2026 09:15", comment: "Документы проверены, всё верно" },
      { id: 4, order: 2, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров И.А.",  status: "active"                                                                             },
    ],
  },
  // 2846 — В реестре (крупная сумма): все три этапа пройдены
  {
    paymentId: 2846,
    routeId:   3,
    stages: [
      { id: 5, order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Е.В.", status: "approved", actionDate: "23.06.2026 11:00", comment: "Бюджет подтверждён"     },
      { id: 6, order: 2, stageName: "Утверждение директором",     role: "director",  assignee: "Нечаев О.В.",  status: "approved", actionDate: "23.06.2026 14:30", comment: "Согласовано"            },
      { id: 7, order: 3, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров И.А.",  status: "approved", actionDate: "23.06.2026 16:00", comment: "Включено в реестр"      },
    ],
  },
  // 2847 — Оплачена: быстрый маршрут, один этап пройден
  {
    paymentId: 2847,
    routeId:   2,
    stages: [
      { id: 8, order: 1, stageName: "Утверждение казначеем", role: "treasurer", assignee: "Петров И.А.", status: "approved", actionDate: "15.06.2026 10:00", comment: "К оплате" },
    ],
  },
  // 2848 — Отклонена: этап 1 отклонён руководителем
  {
    paymentId: 2848,
    routeId:   1,
    stages: [
      { id: 9,  order: 1, stageName: "Согласование руководителем", role: "manager",   assignee: "Козлова Е.В.", status: "rejected", actionDate: "14.06.2026 17:30", comment: "Неверные реквизиты, повторите заявку" },
      { id: 10, order: 2, stageName: "Утверждение казначеем",      role: "treasurer", assignee: "Петров И.А.",  status: "skipped"                                                                                    },
    ],
  },
];
