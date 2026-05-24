import { apiFetch } from "./client";
import type { AiAction, AiMessageResponse } from "@/types/ia";

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
