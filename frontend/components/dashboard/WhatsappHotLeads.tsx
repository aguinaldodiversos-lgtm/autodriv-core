"use client";

import { PhoneCall, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { HumanRequiredLead, SellerAction } from "@/types/dashboard";

const priorityTone = {
  urgent: "red",
  high: "amber",
  medium: "blue",
  low: "slate"
} as const;

function intentLabel(intent?: string | null) {
  const labels: Record<string, string> = {
    BUY_INTENT: "Compra",
    TRADE_IN: "Troca",
    FINANCING: "Financiamento",
    APPRAISAL: "Avaliacao",
    GENERAL_QUESTION: "Duvida",
    SUPPORT_OR_POST_SALE: "Suporte",
    UNKNOWN: "Indefinido"
  };
  return intent ? labels[intent] || intent : "Sem intencao";
}

export function WhatsappHotLeads({
  leads,
  actions,
  busyId,
  onClaim,
  onComplete
}: {
  leads: HumanRequiredLead[];
  actions: SellerAction[];
  busyId?: number | null;
  onClaim: (actionId: number) => void;
  onComplete: (actionId: number, outcome: "reply" | "appointment" | "proposal" | "sale" | "no_result") => void;
}) {
  const visibleActions = actions.slice(0, 6);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-950">WhatsApp quente</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum lead aguardando humano agora.</p>
          ) : (
            leads.slice(0, 6).map((lead) => (
              <div key={lead.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{lead.name || "Lead WhatsApp"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.phone || "Sem telefone"} · {intentLabel(lead.intent)}
                    </p>
                  </div>
                  <Badge tone={(lead.seller_action_priority && priorityTone[lead.seller_action_priority]) || "amber"}>
                    {lead.lead_score || 0}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {lead.seller_action_title || "Atendimento humano solicitado pelo pre-atendimento."}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-950">Acoes do vendedor</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleActions.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma acao pendente do WhatsApp AI.</p>
          ) : (
            visibleActions.map((action) => (
              <div key={action.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {action.lead_name || "Lead WhatsApp"} · {intentLabel(action.intent)}
                    </p>
                  </div>
                  <Badge tone={priorityTone[action.priority]}>{action.priority}</Badge>
                </div>
                {action.description ? <p className="mt-2 text-sm text-slate-600">{action.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {action.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === action.id}
                      onClick={() => onClaim(action.id)}
                    >
                      Assumir
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === action.id}
                    onClick={() => onComplete(action.id, "reply")}
                  >
                    Respondeu
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === action.id}
                    onClick={() => onComplete(action.id, "appointment")}
                  >
                    Agendou
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === action.id}
                    onClick={() => onComplete(action.id, "proposal")}
                  >
                    Proposta
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === action.id}
                    onClick={() => onComplete(action.id, "sale")}
                  >
                    Venda
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busyId === action.id}
                    onClick={() => onComplete(action.id, "no_result")}
                  >
                    Sem resultado
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
