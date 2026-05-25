import { apiFetch } from "./client";
import type { CreateVeiculoPayload, Veiculo } from "@/types/veiculo";

export function listVeiculos() {
  return apiFetch<Veiculo[]>("/api/vehicles");
}

export function createVeiculo(payload: CreateVeiculoPayload) {
  return apiFetch<Veiculo>("/api/vehicles", {
    method: "POST",
    body: payload
  });
}

export function updateVeiculo(id: number, payload: CreateVeiculoPayload) {
  return apiFetch<Veiculo>(`/api/vehicles/${id}`, {
    method: "PUT",
    body: payload
  });
}
