"use client";

import { useEffect, useState } from "react";
import { Bot, BrainCircuit, MessageSquareText, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { ActionOutcomeModal } from "@/components/intelligence/ActionOutcomeModal";
import { formatCurrency } from "@/lib/utils/formatters";
import { getAiLearningMetrics, listTodayAiActions, sendAiActionFeedback } from "@/lib/api/ia";
import type { AiAction, AiFeedbackStatus, AiLearningMetrics } from "@/types/ia";

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
  const [learningError, setLearningError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [outcomeAction, setOutcomeAction] = useState<AiAction | null>(null);
  const [learning, setLearning] = useState<AiLearningMetrics | null>(null);

  useEffect(() => {
    listTodayAiActions()
      .then((response) => setActions(response.actions))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));

    getAiLearningMetrics()
      .then(setLearning)
      .catch((err: Error) => setLearningError(err.message));
  }, []);

  async function decideAction(action: AiAction, status: AiFeedbackStatus) {
    setError(null);
    setDecidingId(action.id);

    try {
      await sendAiActionFeedback(action.id, status);
      setActions((current) => current.filter((item) => item.id !== action.id));
      if (status === "accepted") {
        setOutcomeAction(action);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar o feedback.");
    } finally {
      setDecidingId(null);
    }
  }

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
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={decidingId === action.id}
                          onClick={() => decideAction(action, "ignored")}
                        >
                          Ignorar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={decidingId === action.id}
                          onClick={() => decideAction(action, "accepted")}
                        >
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Painel de aprendizado</CardTitle>
                <Badge variant="info">{learning?.period_days ?? 90} dias</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {learningError ? (
                <EmptyState title="Não foi possível carregar aprendizado" description={learningError} icon={<Bot className="h-6 w-6" />} />
              ) : !learning ? (
                <div className="text-sm text-slate-500">Carregando aprendizado...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-100 p-4">
                      <p className="text-xs font-medium uppercase text-slate-500">Aceitação</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{learning.summary.acceptance_rate}%</p>
                      <p className="mt-1 text-sm text-slate-500">{learning.summary.accepted_actions} de {learning.summary.total_actions} ações</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-4">
                      <p className="text-xs font-medium uppercase text-slate-500">Resultado</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{learning.summary.outcome_rate}%</p>
                      <p className="mt-1 text-sm text-slate-500">{learning.summary.outcomes_recorded} resultados registrados</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-4">
                      <p className="text-xs font-medium uppercase text-slate-500">Vendas</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{learning.summary.sales_generated}</p>
                      <p className="mt-1 text-sm text-slate-500">geradas por ações aceitas</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-4">
                      <p className="text-xs font-medium uppercase text-slate-500">ROI proxy</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(learning.summary.value_per_accepted_action)}</p>
                      <p className="mt-1 text-sm text-slate-500">valor por ação aceita</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-950">Ações que mais geram resultado</h3>
                    <Table
                      rows={learning.by_action_type}
                      getRowKey={(row) => row.type}
                      columns={[
                        { key: "type", header: "Tipo" },
                        { key: "accepted_actions", header: "Aceitas" },
                        { key: "positive_outcomes", header: "Resultados" },
                        { key: "sales_generated", header: "Vendas" },
                        { key: "positive_outcome_rate", header: "Conversão", render: (row) => `${row.positive_outcome_rate}%` },
                        { key: "outcome_value_total", header: "Valor", render: (row) => formatCurrency(row.outcome_value_total) }
                      ]}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-slate-950">Vendedores que mais convertem</h3>
                      <Table
                        rows={learning.by_seller}
                        getRowKey={(row) => row.user_id ?? row.user_name}
                        columns={[
                          { key: "user_name", header: "Vendedor" },
                          { key: "positive_outcomes", header: "Resultados" },
                          { key: "sales_generated", header: "Vendas" },
                          { key: "proposals_generated", header: "Propostas" },
                          { key: "outcome_value_total", header: "Valor", render: (row) => formatCurrency(row.outcome_value_total) }
                        ]}
                      />
                    </div>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-slate-950">Resultados por tipo</h3>
                      <Table
                        rows={learning.by_outcome_type}
                        getRowKey={(row) => row.outcome_type}
                        columns={[
                          { key: "outcome_type", header: "Resultado" },
                          { key: "total", header: "Total" },
                          { key: "outcome_value_total", header: "Valor", render: (row) => formatCurrency(row.outcome_value_total) }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <ActionOutcomeModal
          action={outcomeAction}
          source="ia"
          onClose={() => setOutcomeAction(null)}
          onSaved={() => {
            setOutcomeAction(null);
            getAiLearningMetrics()
              .then(setLearning)
              .catch((err: Error) => setLearningError(err.message));
          }}
        />
      </PermissionGate>
    </AppShell>
  );
}
