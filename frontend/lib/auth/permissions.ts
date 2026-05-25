import type { Role } from "./roles";

export const permissions = [
  "dashboard:view",
  "clientes:view",
  "clientes:create",
  "clientes:update",
  "leads:view",
  "leads:create",
  "leads:update",
  "veiculos:view",
  "veiculos:create",
  "veiculos:update",
  "contratos:view",
  "contratos:create",
  "contratos:update",
  "financeiro:view",
  "financeiro:create",
  "financeiro:update",
  "ia:view",
  "ia:execute",
  "settings:view",
  "settings:update",
  "users:manage"
] as const;

export type Permission = (typeof permissions)[number];

const allPermissions = [...permissions];

export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: allPermissions,
  admin: allPermissions,
  gestor: [
    "dashboard:view",
    "clientes:view",
    "clientes:create",
    "clientes:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "veiculos:view",
    "veiculos:create",
    "veiculos:update",
    "contratos:view",
    "contratos:create",
    "contratos:update",
    "financeiro:view",
    "financeiro:create",
    "financeiro:update",
    "ia:view",
    "ia:execute",
    "settings:view"
  ],
  vendedor: [
    "dashboard:view",
    "clientes:view",
    "clientes:create",
    "clientes:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "veiculos:view",
    "contratos:view",
    "contratos:create",
    "ia:view",
    "ia:execute"
  ],
  financeiro: [
    "dashboard:view",
    "clientes:view",
    "leads:view",
    "veiculos:view",
    "contratos:view",
    "financeiro:view",
    "financeiro:create",
    "financeiro:update"
  ],
  operador: [
    "dashboard:view",
    "clientes:view",
    "leads:view",
    "veiculos:view",
    "veiculos:update",
    "ia:view"
  ],
  cliente: ["dashboard:view"],
  auditor: [
    "dashboard:view",
    "clientes:view",
    "leads:view",
    "veiculos:view",
    "contratos:view",
    "financeiro:view",
    "ia:view",
    "settings:view"
  ],
  ia_agent: ["dashboard:view", "leads:view", "ia:view", "ia:execute"]
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}
