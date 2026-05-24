"use client";

import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { clearSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";

export function Topbar() {
  const router = useRouter();

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden h-9 w-80 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 md:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400">Buscar cliente, lead ou veiculo</span>
        </div>
      </div>
      <Button variant="secondary" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </header>
  );
}
