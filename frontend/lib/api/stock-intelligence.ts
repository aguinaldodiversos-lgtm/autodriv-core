import { apiFetch } from "./client";
import type {
  StockVehicle,
  UpsertPreparationTaskPayload,
  VehicleIntelligenceDetail,
  VehiclePreparationTask
} from "@/types/stock-intelligence";

export function listStockIntelligence() {
  return apiFetch<StockVehicle[]>("/api/stock-intelligence");
}

export function getVehicleIntelligence(vehicleId: number) {
  return apiFetch<VehicleIntelligenceDetail>(`/api/stock-intelligence/${vehicleId}`);
}

export function upsertVehiclePreparationTask(vehicleId: number, payload: UpsertPreparationTaskPayload) {
  return apiFetch<VehiclePreparationTask>(`/api/stock-intelligence/${vehicleId}/preparation-tasks`, {
    method: "POST",
    body: payload
  });
}
