export type AdPreparationCheckStatus =
  | "missing"
  | "pending"
  | "valid"
  | "warning"
  | "blocked"
  | "manually_approved";

export type AdPreparationIssue = {
  key: string;
  category: string;
  message: string;
  actionHint?: string | null;
};

export type AdPreparationCheck = {
  key: string;
  category: string;
  status: AdPreparationCheckStatus;
  severity: "info" | "warning" | "blocking" | "critical";
  required: boolean;
  weight: number;
  currentValue?: unknown;
  expectedValue?: unknown;
  message?: string | null;
  actionHint?: string | null;
  lastCheckedAt?: string | null;
  manuallyApprovedBy?: number | null;
  manuallyApprovedAt?: string | null;
  manualApprovalReason?: string | null;
};

export type AdPreparationScore = {
  score: number;
  grade: string;
  canPublish: boolean;
  status: string;
  blockingReasons: AdPreparationIssue[];
  warnings: AdPreparationIssue[];
  breakdown: Record<string, number>;
  checks: AdPreparationCheck[];
  suggestions?: AdPreparationSuggestion[];
};

export type AdPreparationSuggestionPayload = {
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedPrice?: number;
  minAcceptablePrice?: number | null;
  targetMarginAmount?: number | null;
  targetMarginPercent?: number | null;
  fipeDeltaAmount?: number | null;
  fipeDeltaPercent?: number | null;
  strategy?: string;
  confidence?: number;
  priority?: "low" | "normal" | "high" | "urgent";
  reason?: string;
  recommendedActions?: string[];
  highlights?: string[];
  warnings?: string[];
  reasons?: string[];
  usedFields?: string[];
};

export type AdPreparationSuggestion = {
  id: number;
  vehicle_id?: number;
  dealership_id?: number;
  suggestion_type?: "description" | "price" | "priority";
  provider?: string;
  status?: string;
  payload: AdPreparationSuggestionPayload;
  created_at?: string;
};

export type PublishVehicleResult = {
  vehicle: {
    id: number;
    ad_status?: string | null;
    status?: string | null;
    ad_quality_score?: number | null;
  };
  preparation: AdPreparationScore;
};
