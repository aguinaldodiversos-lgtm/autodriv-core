export const roles = [
  "super_admin",
  "admin",
  "gestor",
  "vendedor",
  "financeiro",
  "operador",
  "cliente",
  "auditor",
  "ia_agent"
] as const;

export type Role = (typeof roles)[number];

export const backendRoleAliases: Record<string, Role> = {
  admin: "admin",
  manager: "gestor",
  seller: "vendedor",
  maintenance: "operador"
};

export function normalizeRole(role: string | undefined | null): Role {
  if (!role) return "operador";
  if (roles.includes(role as Role)) return role as Role;
  return backendRoleAliases[role] || "operador";
}
