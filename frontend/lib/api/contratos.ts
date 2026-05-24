import { apiFetch } from "./client";
import type { Contrato } from "@/types/contrato";

export async function listContratos(): Promise<Contrato[]> {
  return apiFetch<Contrato[]>("/api/contracts");
}

export async function getContrato(id: number | string): Promise<Contrato> {
  return apiFetch<Contrato>(`/api/contracts/${id}`);
}
