import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</main>
        </div>
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}
