import type { Role } from "@/lib/auth/roles";

export type User = {
  id: number;
  email: string;
  name?: string;
  role: Role | string;
  dealership_id?: number;
};
