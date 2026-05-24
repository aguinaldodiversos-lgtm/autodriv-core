"use client";

import type { Session, SessionUser } from "@/types/auth";
import { normalizeRole } from "./roles";

const TOKEN_KEY = "autodriv_token";
const USER_KEY = "autodriv_user";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  if (!payload) return {};
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(normalized);
  return JSON.parse(json) as Record<string, unknown>;
}

function userFromToken(token: string): SessionUser {
  try {
    const payload = decodeJwtPayload(token);
    return {
      id: typeof payload.user_id === "number" ? payload.user_id : undefined,
      role: normalizeRole(typeof payload.role === "string" ? payload.role : undefined),
      dealership_id:
        typeof payload.dealership_id === "number" ? payload.dealership_id : undefined
    };
  } catch {
    return { role: "operador" };
  }
}

export function saveSession(token: string) {
  const user = userFromToken(token);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  return { token, user };
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const rawUser = localStorage.getItem(USER_KEY);
  const user = rawUser ? (JSON.parse(rawUser) as SessionUser) : userFromToken(token);
  return { token, user: { ...user, role: normalizeRole(user.role) } };
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
}
