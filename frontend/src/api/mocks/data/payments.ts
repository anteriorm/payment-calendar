/** Формат: Payment (заявка на платёж) — совпадает с GET /api/payments */
export type PaymentStatus   = "draft" | "pending" | "approved" | "in_registry" | "paid" | "rejected";
export type PaymentPriority = "high" | "medium" | "low";

export interface Payment {
  id:              number;
  planned_date:    string;
  account_id:      number;
  account_name:    string;
  counterparty_id: number;
  counterparty:    string;
  item_id:         number;
  item:            string;
  amount:          number;
  priority:        PaymentPriority;
  status:          PaymentStatus;
  purpose:         string;
  created_by:      string;
  created_at:      string;
}

export const mockPayments: Payment[] = [];
