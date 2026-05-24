import { apiFetch } from "./client";
import type { OperationsDashboard } from "@/types/dashboard";

export function getOperationsDashboard() {
  return apiFetch<OperationsDashboard>("/api/dashboard/operations");
}

export function getDashboardStats() {
  return apiFetch<Record<string, number | string>>("/api/dashboard");
}
