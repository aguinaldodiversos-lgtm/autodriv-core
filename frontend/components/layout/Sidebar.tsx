"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Car,
  FileText,
  LayoutDashboard,
  Settings,
  UserRound,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: UserRound },
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/veiculos", label: "Veiculos", icon: Car },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/ia", label: "IA", icon: Bot },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block">
      <div className="flex h-16 items-center border-b border-slate-100 px-6">
        <div>
          <p className="text-base font-semibold text-slate-950">AutoDriv</p>
          <p className="text-xs text-slate-500">CRM inteligente</p>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-4 mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <BarChart3 className="h-5 w-5 text-slate-700" />
        <p className="mt-3 text-sm font-semibold text-slate-950">Cockpit operacional</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Leads, inbox, estoque e IA conectados para a rotina comercial.
        </p>
      </div>
    </aside>
  );
}
