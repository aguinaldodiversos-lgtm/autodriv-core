import { apiFetch } from "./client";
import type { AuthMeResponse, LoginPayload, LoginResponse } from "@/types/auth";

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
    token: null
  });
}

export function getCurrentSession(token?: string) {
  return apiFetch<AuthMeResponse>("/api/auth/me", {
    token
  });
}
