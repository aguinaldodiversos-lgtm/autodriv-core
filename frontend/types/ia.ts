export type AiAction = {
  id: number;
  type: string;
  reason: string;
  suggested_action: string;
  priority_score?: number;
  priority_label?: string;
  explanation?: string | null;
  status?: "pending" | "accepted" | "ignored";
};

export type AiFeedbackStatus = "accepted" | "ignored";

export type AiOutcomeType =
  | "sale"
  | "reply"
  | "proposal"
  | "appointment"
  | "repurchase"
  | "no_result";

export type AiActionOutcomePayload = {
  outcome_type: AiOutcomeType;
  outcome_value?: number | null;
  notes?: string;
  occurred_at?: string;
  metadata?: Record<string, unknown>;
};

export type AiActionOutcome = AiActionOutcomePayload & {
  id: number;
  action_id: number;
  dealership_id: number;
  recorded_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type AiLearningSummary = {
  total_actions: number;
  pending_actions: number;
  accepted_actions: number;
  ignored_actions: number;
  outcomes_recorded: number;
  positive_outcomes: number;
  sales_generated: number;
  outcome_value_total: number;
  acceptance_rate: number;
  outcome_rate: number;
  positive_outcome_rate: number;
  value_per_accepted_action: number;
};

export type AiLearningOutcomeType = {
  outcome_type: AiOutcomeType;
  total: number;
  outcome_value_total: number;
};

export type AiLearningActionType = {
  type: string;
  total_actions: number;
  accepted_actions: number;
  ignored_actions: number;
  outcomes_recorded: number;
  positive_outcomes: number;
  sales_generated: number;
  proposals_generated: number;
  outcome_value_total: number;
  average_priority_score: number;
  acceptance_rate: number;
  outcome_rate: number;
  positive_outcome_rate: number;
};

export type AiLearningSeller = {
  user_id?: number | null;
  user_name: string;
  outcomes_recorded: number;
  positive_outcomes: number;
  sales_generated: number;
  proposals_generated: number;
  appointments_generated: number;
  outcome_value_total: number;
  positive_outcome_rate: number;
};

export type AiLearningMetrics = {
  generated_at: string;
  period_days: number;
  summary: AiLearningSummary;
  by_outcome_type: AiLearningOutcomeType[];
  by_action_type: AiLearningActionType[];
  by_seller: AiLearningSeller[];
};

export type AiMessageResponse = {
  reply?: string;
  stage?: string;
  lead_score?: string;
  [key: string]: unknown;
};
