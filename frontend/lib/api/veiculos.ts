import { apiFetch } from "./client";
import type { CreateVeiculoPayload, SellVehiclePayload, SellVehicleResult, Veiculo, VehicleOperationalResponse, VehicleOperationalView } from "@/types/veiculo";

export function listVeiculos() {
  return apiFetch<Veiculo[]>("/api/vehicles");
}

export type VehicleOperationalFilters = {
  view: VehicleOperationalView;
  search?: string;
  status?: string;
  brand?: string;
  model?: string;
  minPrice?: string;
  maxPrice?: string;
  minScore?: string;
  maxScore?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export function listVehicleOperationalView(filters: VehicleOperationalFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  return apiFetch<VehicleOperationalResponse>(`/api/vehicles?${params.toString()}`);
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

export function sellVeiculo(id: number, payload: SellVehiclePayload) {
  return apiFetch<SellVehicleResult>(`/api/vehicles/${id}/sell`, {
    method: "POST",
    body: payload
  });
}
