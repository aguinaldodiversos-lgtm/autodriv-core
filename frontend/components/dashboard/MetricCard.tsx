import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
};

export function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
        </div>
        {icon ? <div className="rounded-md bg-slate-100 p-2 text-slate-700">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
