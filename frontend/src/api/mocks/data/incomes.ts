export type IncomeStatus = "planned" | "confirmed" | "received" | "canceled";

export interface Income {
  id:              number;
  planned_date:    string;
  account_id:      number;
  account_name:    string;
  counterparty_id: number;
  counterparty:    string;
  item_id:         number;
  item:            string;
  amount:          number;
  status:          IncomeStatus;
  priority:        "high" | "medium" | "low";
  purpose:         string;
  created_by:      string;
}

export const mockIncomes: Income[] = [];
