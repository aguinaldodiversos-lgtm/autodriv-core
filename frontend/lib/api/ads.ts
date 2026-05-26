import { apiFetch } from "./client";
import type { PreparedAd } from "@/types/ad";

export function listVehicleAds(vehicleId: number) {
  return apiFetch<PreparedAd[]>(`/api/ads/vehicle/${vehicleId}`);
}

export function generateVehicleAd(vehicleId: number, platform: string) {
  return apiFetch<PreparedAd>("/api/ads/generate", {
    method: "POST",
    body: {
      vehicle_id: vehicleId,
      platform
    }
  });
}
