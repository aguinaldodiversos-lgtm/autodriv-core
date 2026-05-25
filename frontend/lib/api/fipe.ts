import { apiFetch } from "./client";
import type { FipeBrand, FipeModelsResponse, FipeValue, FipeYear } from "@/types/fipe";

const type = "carros";

export function listFipeBrands() {
  return apiFetch<FipeBrand[]>(`/api/fipe/brands?type=${type}`);
}

export function listFipeModels(brandCode: string) {
  return apiFetch<FipeModelsResponse>(`/api/fipe/models?type=${type}&brandCode=${encodeURIComponent(brandCode)}`);
}

export function listFipeYears(brandCode: string, modelCode: string) {
  return apiFetch<FipeYear[]>(
    `/api/fipe/years?type=${type}&brandCode=${encodeURIComponent(brandCode)}&modelCode=${encodeURIComponent(modelCode)}`
  );
}

export function getFipeValue(brandCode: string, modelCode: string, yearCode: string) {
  return apiFetch<FipeValue>(
    `/api/fipe/value?type=${type}&brandCode=${encodeURIComponent(brandCode)}&modelCode=${encodeURIComponent(modelCode)}&yearCode=${encodeURIComponent(yearCode)}`
  );
}
