"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, Inbox, UsersRound } from "lucide-react";
import { getOperationsDashboard } from "@/lib/api/dashboard";
import { sendAiActionFeedback } from "@/lib/api/ia";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { ActionOutcomeModal } from "@/components/intelligence/ActionOutcomeModal";
import { PriorityActionList } from "@/components/intelligence/PriorityActionList";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { IntelligenceAction, OperationsDashboard } from "@/types/dashboard";

export default function DashboardPage() {
  const [data, setData] = useState<OperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [outcomeAction, setOutcomeAction] = useState<IntelligenceAction | null>(null);

  useEffect(() => {
    getOperationsDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar dashboard."))
      .finally(() => setLoading(false));
  }, []);

  async function decideAction(action: IntelligenceAction, status: "accepted" | "ignored") {
    setError(null);
    setDecidingId(action.id);

    try {
      await sendAiActionFeedback(action.id, status);
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          intelligence: {
            ...current.intelligence,
            actions: current.intelligence.actions.filter((item) => item.id !== action.id)
          }
        };
      });
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">Cockpit do lojista</h1>
        <p className="mt-1 text-sm text-slate-500">
          Prioridades comerciais, inbox, estoque e financeiro em uma visao operacional.
        </p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Carregando indicadores...</p> : null}
      {error ? (
        <EmptyState title="Nao foi possivel carregar o dashboard" description={error} />
      ) : null}

      {data ? (
        <div className="space-y-6">
          {data.status === "partial" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Alguns modulos ainda estao sem estrutura no banco. O cockpit foi carregado com dados parciais.
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Acoes criticas"
              value={data.summary_cards.find((item) => item.key === "critical_actions")?.value || 0}
              detail="Geradas pela inteligencia do dia"
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              label="Alto impacto"
              value={data.intelligence.summary.high_impact_actions || 0}
              detail="Maior chance de retorno"
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              label="Mensagens nao lidas"
              value={data.inbox.summary.unread || 0}
              detail="Conversas abertas no inbox"
              icon={<Inbox className="h-5 w-5" />}
            />
            <MetricCard
              label="SLA vencido"
              value={(data.inbox.summary.overdue_sla || 0) + (data.pipeline.summary.overdue_sla || 0)}
              detail="Atendimentos ou etapas atrasadas"
              icon={<Clock className="h-5 w-5" />}
            />
          </section>

          <PriorityActionList
            actions={data.intelligence.actions || []}
            decidingId={decidingId}
            onDecision={decideAction}
            limit={8}
          />

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <PipelineSummary stages={data.pipeline.stages || []} />
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-slate-950">Resumo inteligente</h2>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-600">
                <div className="flex justify-between rounded-md border border-slate-100 p-3">
                  <span>Leads no funil</span>
                  <strong className="text-slate-950">{data.pipeline.summary.open_leads || 0}</strong>
                </div>
                <div className="flex justify-between rounded-md border border-slate-100 p-3">
                  <span>Financeiro</span>
                  <strong className="text-slate-950">{data.intelligence.summary.finance_alerts || 0}</strong>
                </div>
                <div className="flex justify-between rounded-md border border-slate-100 p-3">
                  <span>Estoque</span>
                  <strong className="text-slate-950">{data.intelligence.summary.stock_alerts || 0}</strong>
                </div>
                <div className="flex justify-between rounded-md border border-slate-100 p-3">
                  <span>Pos-venda</span>
                  <strong className="text-slate-950">{data.intelligence.summary.after_sales_alerts || 0}</strong>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-950">Inbox recente</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.inbox.conversations.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma conversa aberta.</p>
              ) : (
                data.inbox.conversations.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">{item.lead_name || "Lead sem nome"}</p>
                      <p className="text-xs text-slate-500">{item.channel} - {item.status}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{item.unread_count || 0}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ActionOutcomeModal
        action={outcomeAction}
        source="dashboard"
        onClose={() => setOutcomeAction(null)}
        onSaved={() => setOutcomeAction(null)}
      />
    </AppShell>
  );
}
