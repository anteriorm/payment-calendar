export type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringStatus   = "active" | "paused" | "completed";

export interface RecurringTemplate {
  id:              number;
  name:            string;
  counterparty:    string;
  article:         string;
  account:         string;
  amount:          number;
  frequency:       RecurringFrequency;
  start_date:      string;
  end_date?:       string;
  next_date:       string;
  status:          RecurringStatus;
  last_created?:   string;
  created_count:   number;
  purpose:         string;
  priority:        "high" | "medium" | "low";
  created_by:      string;
}

export const mockRecurringTemplates: RecurringTemplate[] = [];
