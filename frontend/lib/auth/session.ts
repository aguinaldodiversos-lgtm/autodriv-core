"use client";

import type { AuthMeResponse, Session, SessionUser } from "@/types/auth";
import type { Permission } from "./permissions";
import { normalizeRole } from "./roles";

const TOKEN_KEY = "autodriv_token";
const USER_KEY = "autodriv_user";
const PERMISSIONS_KEY = "autodriv_permissions";

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

function normalizeUser(user: SessionUser): SessionUser {
  return { ...user, role: normalizeRole(user.role) };
}

export function saveSession(token: string, profile?: AuthMeResponse) {
  const user = profile
    ? normalizeUser({
        id: profile.user.id,
        email: profile.user.email,
        role: normalizeRole(profile.user.role),
        dealership_id: profile.user.dealership_id
      })
    : userFromToken(token);

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (profile?.permissions) {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(profile.permissions));
  }
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  return { token, user, permissions: profile?.permissions };
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const rawUser = localStorage.getItem(USER_KEY);
  const rawPermissions = localStorage.getItem(PERMISSIONS_KEY);
  const user = rawUser ? (JSON.parse(rawUser) as SessionUser) : userFromToken(token);
  const permissions = rawPermissions ? (JSON.parse(rawPermissions) as Permission[]) : undefined;
  return { token, user: normalizeUser(user), permissions };
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
}
