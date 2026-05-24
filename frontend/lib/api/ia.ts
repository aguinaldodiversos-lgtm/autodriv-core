import { apiFetch } from "./client";
import type {
  AiAction,
  AiActionOutcome,
  AiActionOutcomePayload,
  AiFeedbackStatus,
  AiLearningMetrics,
  AiMessageResponse
} from "@/types/ia";

export function listTodayAiActions() {
  return apiFetch<{ actions: AiAction[]; summary: Record<string, number> }>(
    "/api/intelligence/today"
  );
}

export function sendLeadAiMessage(payload: { lead_id: number; message: string }) {
  return apiFetch<AiMessageResponse>("/api/ai-seller/message", {
    method: "POST",
    body: payload
  });
}

export function sendAiActionFeedback(actionId: number, status: AiFeedbackStatus) {
  return apiFetch<AiAction>(`/api/intelligence/actions/${actionId}/feedback`, {
    method: "PATCH",
    body: { status }
  });
}

export function recordAiActionOutcome(actionId: number, payload: AiActionOutcomePayload) {
  return apiFetch<AiActionOutcome>(`/api/intelligence/actions/${actionId}/outcome`, {
    method: "POST",
    body: payload
  });
}

export function getAiLearningMetrics(days = 90) {
  return apiFetch<AiLearningMetrics>(`/api/intelligence/learning-metrics?days=${days}`);
}
