import { apiFetch } from "./client";
import type { Cliente } from "@/types/cliente";

export function listClientes() {
  return apiFetch<Cliente[]>("/api/clients");
}
