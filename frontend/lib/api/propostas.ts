import { apiFetch } from "./client";
import type { AcceptPropostaPayload, AcceptPropostaResult, Proposta } from "@/types/proposta";

export async function listPropostas(): Promise<Proposta[]> {
  return apiFetch<Proposta[]>("/api/proposals");
}

export async function acceptProposta(id: number | string, payload: AcceptPropostaPayload): Promise<AcceptPropostaResult> {
  return apiFetch<AcceptPropostaResult>(`/api/proposals/${id}/accept`, {
    method: "POST",
    body: payload
  });
}
