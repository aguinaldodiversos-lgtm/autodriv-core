import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { IntelligenceAction } from "@/types/dashboard";

export function RecentActivity({ actions }: { actions: IntelligenceAction[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-950">Ações inteligentes</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma prioridade pendente agora.</p>
        ) : (
          actions.slice(0, 6).map((action) => (
            <div key={action.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-950">{action.reason}</p>
                <Badge tone={action.priority_label === "critical" ? "red" : "amber"}>
                  {action.priority_score || 0}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{action.suggested_action}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
