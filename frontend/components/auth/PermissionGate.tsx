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
  if (!session || !hasPermission(session.user.role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
