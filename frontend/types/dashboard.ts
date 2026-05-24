import type { Lead } from "./lead";

export type MetricCard = {
  key: string;
  label: string;
  value: number | string;
};

export type IntelligenceAction = {
  id: number;
  type: string;
  priority_label?: string;
  priority_score?: number;
  reason: string;
  suggested_action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  explanation?: string | null;
  status?: "pending" | "accepted" | "ignored";
};

export type InboxConversation = {
  id: number;
  channel: string;
  status: string;
  lead_name?: string | null;
  lead_phone?: string | null;
  assigned_user_name?: string | null;
  unread_count?: number;
  sla_due_at?: string | null;
  last_message_at?: string | null;
};

export type PipelineStage = {
  id: number;
  key: string;
  name: string;
  color?: string | null;
  leads: Lead[];
};

export type OperationsDashboard = {
  generated_at: string;
  summary_cards: MetricCard[];
  intelligence: {
    summary: Record<string, number>;
    actions: IntelligenceAction[];
  };
  inbox: {
    summary: Record<string, number>;
    conversations: InboxConversation[];
  };
  pipeline: {
    summary: {
      open_leads: number;
      overdue_sla: number;
      stages: Array<{ id: number; key: string; name: string; total: number }>;
    };
    stages: PipelineStage[];
  };
};
