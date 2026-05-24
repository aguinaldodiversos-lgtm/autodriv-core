import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { env } from "@/lib/config/env";

export const metadata: Metadata = {
  title: env.appName,
  description: "CRM automotivo inteligente para lojistas de veículos"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
