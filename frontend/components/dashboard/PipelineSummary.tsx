import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { PipelineStage } from "@/types/dashboard";

export function PipelineSummary({ stages }: { stages: PipelineStage[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-950">Funil comercial</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma etapa carregada.</p>
        ) : (
          stages.map((stage) => (
            <div key={stage.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{stage.name}</span>
                <span className="text-slate-500">{stage.leads?.length || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${Math.min(100, (stage.leads?.length || 0) * 12)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
