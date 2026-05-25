import { apiFetch } from "./client";
import type { CreateFinanceEntryPayload, FinanceEntry, FinanceSummary } from "@/types/financeiro";

export function listFinanceEntries() {
  return apiFetch<FinanceEntry[]>("/api/finance");
}

export function getFinanceSummary() {
  return apiFetch<FinanceSummary>("/api/finance/summary");
}

export function createFinanceEntry(payload: CreateFinanceEntryPayload) {
  return apiFetch<FinanceEntry>("/api/finance", {
    method: "POST",
    body: payload
  });
}

export function markFinanceEntryAsPaid(id: number) {
  return apiFetch<FinanceEntry>(`/api/finance/${id}/pay`, {
    method: "PUT"
  });
}
