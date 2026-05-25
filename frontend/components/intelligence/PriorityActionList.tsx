import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/formatters";

export type PriorityAction = {
  id: number;
  type: string;
  reason: string;
  suggested_action: string;
  priority_score?: number;
  priority_label?: string | null;
  explanation?: string | null;
  impact_area?: string | null;
  impact_label?: string | null;
  impact_estimate?: number | string | null;
  expected_outcome?: string | null;
  recommended_channel?: string | null;
};

const areaLabels: Record<string, string> = {
  sales: "Vendas",
  stock: "Estoque",
  finance: "Financeiro",
  marketing: "Anuncios",
  team: "Equipe",
  retention: "Pos-venda",
  operations: "Operacao"
};

const outcomeLabels: Record<string, string> = {
  sale: "Venda",
  reply: "Resposta",
  proposal: "Proposta",
  appointment: "Agendamento",
  repurchase: "Recompra",
  no_result: "Controle"
};

function priorityVariant(priority?: string | null) {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  return "neutral";
}

function areaLabel(area?: string | null) {
  if (!area) return "Operacao";
  return areaLabels[area] || area;
}

function outcomeLabel(outcome?: string | null) {
  if (!outcome) return "Resultado";
  return outcomeLabels[outcome] || outcome;
}

function impactText(action: PriorityAction) {
  const value = Number(action.impact_estimate || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return action.impact_label === "very_high" || action.impact_label === "high"
      ? "Alto impacto"
      : "Impacto operacional";
  }

  return formatCurrency(value);
}

export function PriorityActionList({
  actions,
  title = "Acoes de maior impacto hoje",
  emptyText = "Nenhuma prioridade pendente agora.",
  onDecision,
  decidingId,
  limit
}: {
  actions: PriorityAction[];
  title?: string;
  emptyText?: string;
  onDecision?: (action: PriorityAction, status: "accepted" | "ignored") => void;
  decidingId?: number | null;
  limit?: number;
}) {
  const visibleActions = typeof limit === "number" ? actions.slice(0, limit) : actions;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <Badge variant="info">{actions.length} pendentes</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleActions.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyText}</p>
        ) : (
          visibleActions.map((action, index) => (
            <div key={action.id} className="rounded-lg border border-slate-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <Badge variant={priorityVariant(action.priority_label)}>
                      {action.priority_score || 0} pts
                    </Badge>
                    <Badge variant="neutral">{areaLabel(action.impact_area)}</Badge>
                    <Badge variant="info">{outcomeLabel(action.expected_outcome)}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{action.suggested_action}</p>
                  <p className="mt-1 text-sm text-slate-500">{action.explanation || action.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Impacto: <strong className="text-slate-800">{impactText(action)}</strong></span>
                    <span>Canal: <strong className="text-slate-800">{action.recommended_channel || "crm"}</strong></span>
                  </div>
                </div>

                {onDecision ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={decidingId === action.id}
                      onClick={() => onDecision(action, "ignored")}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Ignorar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={decidingId === action.id}
                      onClick={() => onDecision(action, "accepted")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Executar
                    </Button>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
