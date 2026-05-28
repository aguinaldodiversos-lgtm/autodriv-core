import { apiFetch } from "./client";
import type { SellerAction } from "@/types/dashboard";

export type SellerActionOutcome =
  | "sale"
  | "reply"
  | "proposal"
  | "appointment"
  | "visit_scheduled"
  | "financing_simulation"
  | "trade_in_evaluation"
  | "lost"
  | "no_result";

export function claimSellerAction(id: number) {
  return apiFetch<SellerAction>(`/api/seller-actions/${id}/claim`, {
    method: "POST"
  });
}

export function completeSellerAction(
  id: number,
  payload: {
    outcome_type: SellerActionOutcome;
    outcome_value?: number;
    note?: string;
  }
) {
  return apiFetch<SellerAction>(`/api/seller-actions/${id}/complete`, {
    method: "POST",
    body: payload
  });
}
