"use client";

import { useEffect, useState } from "react";
import { Bot, BrainCircuit, MessageSquareText, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { listTodayAiActions } from "@/lib/api/ia";
import type { AiAction } from "@/types/ia";

const modules = [
  {
    title: "Análise de lead",
    description: "Prioridade, intenção de compra, urgência de resposta e próxima ação sugerida.",
    icon: BrainCircuit,
  },
  {
    title: "Sugestão de follow-up",
    description: "Mensagem recomendada com base no histórico e estágio comercial do contato.",
    icon: MessageSquareText,
  },
  {
    title: "Resumo de cliente",
    description: "Contexto consolidado para o vendedor retomar conversas com mais precisão.",
    icon: Sparkles,
  },
];

export default function IaPage() {
  const [actions, setActions] = useState<AiAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTodayAiActions()
      .then((response) => setActions(response.actions))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell>
      <PermissionGate
        permission="ia:view"
        fallback={<EmptyState title="Acesso restrito" description="Seu perfil não possui permissão para acessar a central de IA." icon={<Bot className="h-6 w-6" />} />}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">IA operacional</h1>
            <p className="mt-1 text-sm text-slate-500">Ações inteligentes para leads, estoque, vendas e pós-venda.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Card key={module.title}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="info">Backend</Badge>
                    </div>
                    <CardTitle className="mt-4">{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-500">{module.description}</p>
                    <PermissionGate permission="ia:execute">
                      <Button type="button" variant="secondary" className="mt-4 w-full" disabled>
                        Executar análise
                      </Button>
                    </PermissionGate>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ações inteligentes de hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <EmptyState title="Não foi possível carregar recomendações" description={error} icon={<Bot className="h-6 w-6" />} />
              ) : isLoading ? (
                <div className="text-sm text-slate-500">Carregando recomendações...</div>
              ) : actions.length === 0 ? (
                <EmptyState
                  title="Nenhuma recomendação disponível"
                  description="Quando o backend gerar recomendações pelo módulo de intelligence, elas aparecerão aqui para aceite ou descarte."
                  icon={<Bot className="h-6 w-6" />}
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {actions.map((action) => (
                    <div key={action.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-950">{action.suggested_action}</p>
                          <Badge variant={action.priority_label === "critical" ? "danger" : action.priority_label === "high" ? "warning" : "neutral"}>
                            {action.priority_label ?? "normal"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{action.explanation ?? action.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="secondary" disabled>
                          Ignorar
                        </Button>
                        <Button type="button" size="sm" disabled>
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </AppShell>
  );
}
