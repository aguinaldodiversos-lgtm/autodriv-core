import type { Role } from "@/lib/auth/roles";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
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
};
