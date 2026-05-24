import { apiFetch } from "./client";
import type { Veiculo } from "@/types/veiculo";

export function listVeiculos() {
  return apiFetch<Veiculo[]>("/api/vehicles");
}
