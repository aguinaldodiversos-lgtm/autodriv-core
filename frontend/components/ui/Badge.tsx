import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
  variant?: "neutral" | "info" | "success" | "warning" | "danger";
};

const tones = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700"
};

const variants = {
  neutral: "slate",
  info: "blue",
  success: "green",
  warning: "amber",
  danger: "red"
} as const;

export function Badge({ children, tone, variant }: BadgeProps) {
  const resolvedTone = tone ?? (variant ? variants[variant] : "slate");

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", tones[resolvedTone])}>
      {children}
    </span>
  );
}
