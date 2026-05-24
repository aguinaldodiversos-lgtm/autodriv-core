export type AiAction = {
  id: number;
  type: string;
  reason: string;
  suggested_action: string;
  priority_score?: number;
  priority_label?: string;
  explanation?: string | null;
};

export type AiMessageResponse = {
  reply?: string;
  stage?: string;
  lead_score?: string;
  [key: string]: unknown;
};
