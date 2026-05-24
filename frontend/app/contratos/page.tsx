"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Input } from "@/components/ui/Input";
import { listContratos } from "@/lib/api/contratos";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Contrato } from "@/types/contrato";

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listContratos()
      .then(setContratos)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredContratos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contratos;

    return contratos.filter((contrato) => {
      return [contrato.sale_id, contrato.client_name, contrato.responsible_name, contrato.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [contratos, query]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Contratos</h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe contratos, valores, status e responsáveis.</p>
          </div>

          <PermissionGate permission="contratos:create">
            <Button type="button" disabled>
              <Plus className="h-4 w-4" />
              Novo contrato
            </Button>
          </PermissionGate>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            className="sm:max-w-sm"
            label="Buscar contrato"
            placeholder="Código, cliente, veículo ou responsável"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {error ? (
          <EmptyState title="Não foi possível carregar contratos" description={error} icon={<FileText className="h-6 w-6" />} />
        ) : isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando contratos...</div>
        ) : filteredContratos.length === 0 ? (
          <EmptyState
            title="Listagem de contratos pendente no backend"
            description="O backend atual possui endpoints de ações por contrato, mas ainda não expõe uma rota de listagem GET /api/contracts. O TODO técnico está registrado no mapa frontend-backend."
            icon={<FileText className="h-6 w-6" />}
          />
        ) : (
          <Table
            columns={[
              { key: "sale_id", header: "Contrato", render: (row) => (row.sale_id ? `Venda #${row.sale_id}` : `Contrato #${row.id}`) },
              { key: "client_name", header: "Cliente", render: (row) => row.client_name ?? "-" },
              { key: "status", header: "Status", render: (row) => <Badge variant="neutral">{row.status}</Badge> },
              { key: "price", header: "Valor", render: (row) => formatCurrency(row.price ?? row.amount) },
              { key: "responsible_name", header: "Responsável", render: (row) => row.responsible_name ?? "Sem responsável" },
              { key: "created_at", header: "Criado em", render: (row) => formatDate(row.created_at) },
            ]}
            rows={filteredContratos}
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </AppShell>
  );
}
