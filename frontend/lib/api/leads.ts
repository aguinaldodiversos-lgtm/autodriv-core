import { apiFetch } from "./client";
import type { Lead } from "@/types/lead";

export function listLeads() {
  return apiFetch<Lead[]>("/api/leads");
}
