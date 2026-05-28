import { apiFetch } from "./client";
import type {
  AdPreparationScore,
  AdPreparationSuggestion,
  PublishVehicleResult
} from "@/types/ad-preparation";

export function getVehiclePreparation(vehicleId: number) {
  return apiFetch<AdPreparationScore>(`/api/vehicles/${vehicleId}/preparation`);
}

export function recalculateVehiclePreparation(vehicleId: number) {
  return apiFetch<AdPreparationScore>(`/api/vehicles/${vehicleId}/preparation/recalculate`, {
    method: "POST"
  });
}

export function suggestVehicleDescription(vehicleId: number) {
  return apiFetch<AdPreparationSuggestion>(`/api/vehicles/${vehicleId}/suggestions/description`, {
    method: "POST"
  });
}

export function suggestVehiclePrice(vehicleId: number) {
  return apiFetch<AdPreparationSuggestion>(`/api/vehicles/${vehicleId}/suggestions/price`, {
    method: "POST"
  });
}

export function suggestVehiclePriority(vehicleId: number) {
  return apiFetch<AdPreparationSuggestion>(`/api/vehicles/${vehicleId}/suggestions/priority`, {
    method: "POST"
  });
}

export function publishVehicle(vehicleId: number) {
  return apiFetch<PublishVehicleResult>(`/api/vehicles/${vehicleId}/publish`, {
    method: "POST"
  });
}
