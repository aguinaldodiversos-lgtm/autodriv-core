"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Handshake, LayoutDashboard, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/veiculos", label: "Estoque", icon: Car },
  { href: "/propostas", label: "Propostas", icon: Handshake }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
              active ? "text-slate-950" : "text-slate-500"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
