export type FinanceEntryType = "income" | "expense";
export type FinanceEntryStatus = "pending" | "paid" | "cancelled";

export type FinanceEntry = {
  id: number;
  dealership_id?: number;
  type: FinanceEntryType;
  category?: string | null;
  description?: string | null;
  amount: number | string;
  due_date?: string | null;
  paid_date?: string | null;
  status: FinanceEntryStatus;
  vehicle_id?: number | null;
  related_sale_id?: number | null;
  notes?: string | null;
  vehicle_title?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  sale_price?: number | string | null;
  created_at?: string;
};

export type CreateFinanceEntryPayload = {
  type: FinanceEntryType;
  category?: string | null;
  description: string;
  amount: number;
  due_date?: string | null;
  status?: FinanceEntryStatus;
  vehicle_id?: number | null;
  related_sale_id?: number | null;
  notes?: string | null;
};

export type FinanceCategorySummary = {
  category: string;
  type: FinanceEntryType;
  total: number | string;
  count: number | string;
};

export type VehicleProfitability = {
  id: number;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  price?: number | string | null;
  purchase_price?: number | string | null;
  acquisition_cost?: number | string | null;
  preparation_cost_actual?: number | string | null;
  finance_expense?: number | string | null;
  finance_income?: number | string | null;
  total_cost: number;
  expected_income: number;
  expected_margin: number;
};

export type FinanceSummary = {
  paid_income: number;
  paid_expense: number;
  pending_income: number;
  pending_expense: number;
  month_income: number;
  month_expense: number;
  overdue_count: number;
  overdue_amount: number;
  current_balance: number;
  projected_balance: number;
  by_category: FinanceCategorySummary[];
  vehicle_profitability: VehicleProfitability[];
};
