"use client";

import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export function PermissionGate({
  permission,
  children,
  fallback = null
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const session = getSession();
  const allowed = session?.permissions
    ? session.permissions.includes(permission)
    : session
      ? hasPermission(session.user.role, permission)
      : false;

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
