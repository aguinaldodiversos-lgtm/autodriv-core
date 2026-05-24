"use client";

import { Lock, Settings, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { env } from "@/lib/config/env";

const settings = [
  {
    title: "Usuários e permissões",
    description: "Base visual preparada para gestão de papéis, convites e acessos por loja.",
    icon: Users,
    status: "Endpoint ausente",
  },
  {
    title: "Segurança",
    description: "Sessão, expiração de token, origem CORS e proteção de rotas sensíveis.",
    icon: ShieldCheck,
    status: "Backend valida",
  },
  {
    title: "Integrações",
    description: "WhatsApp, portais, fontes de lead e automações comerciais.",
    icon: Settings,
    status: "Parcial",
  },
];

export default function ConfiguracoesPage() {
  return (
    <AppShell>
      <PermissionGate
        permission="settings:view"
        fallback={<EmptyState title="Acesso restrito" description="Seu perfil não possui permissão para visualizar configurações." icon={<Lock className="h-6 w-6" />} />}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Configurações</h1>
            <p className="mt-1 text-sm text-slate-500">Estrutura inicial para operação multiusuário, permissões e integrações.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {settings.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={item.status === "Backend valida" ? "success" : item.status === "Parcial" ? "warning" : "neutral"}>{item.status}</Badge>
                    </div>
                    <CardTitle className="mt-4">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-500">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ambiente do frontend</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Aplicação</dt>
                  <dd className="mt-1 font-medium text-slate-950">{env.appName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ambiente</dt>
                  <dd className="mt-1 font-medium text-slate-950">{env.environment}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">API</dt>
                  <dd className="mt-1 truncate font-medium text-slate-950">{env.apiUrl}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </AppShell>
  );
}
