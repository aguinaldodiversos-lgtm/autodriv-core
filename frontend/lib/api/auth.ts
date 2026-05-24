import { apiFetch } from "./client";
import type { LoginPayload, LoginResponse } from "@/types/auth";

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
    token: null
  });
}
