import type { Role } from "@/lib/auth/roles";
import type { Permission } from "@/lib/auth/permissions";
import type { User } from "./user";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export type AuthMeResponse = {
  user: User & {
    dealership_id?: number;
    created_at?: string;
  };
  dealership: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    created_at?: string;
  } | null;
  subscription: {
    id: number;
    plan?: string | null;
    status?: string | null;
    current_period_end?: string | null;
    updated_at?: string | null;
  } | null;
  permissions: Permission[];
};

export type SessionUser = {
  id?: number;
  email?: string;
  role: Role;
  dealership_id?: number;
};

export type Session = {
  token: string;
  user: SessionUser;
  permissions?: Permission[];
};
