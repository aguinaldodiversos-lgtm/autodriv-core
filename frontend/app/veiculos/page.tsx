"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { listVeiculos } from "@/lib/api/veiculos";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils/formatters";
import type { Veiculo } from "@/types/veiculo";

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVeiculos()
      .then(setVeiculos)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar veículos."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return veiculos.filter((veiculo) =>
      [veiculo.title, veiculo.brand, veiculo.model, veiculo.status, veiculo.ad_status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [veiculos, query]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Veículos</h1>
          <p className="mt-1 text-sm text-slate-500">Estoque, preço, status e qualidade comercial.</p>
        </div>
        <PermissionGate permission="veiculos:create">
          <Button><Plus className="h-4 w-4" /> Cadastrar veículo</Button>
        </PermissionGate>
      </div>
      <Card>
        <CardContent>
          <Input placeholder="Buscar por modelo, marca ou status" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="mt-6 text-sm text-slate-500">Carregando estoque...</p> : null}
          {error ? <div className="mt-6"><EmptyState title="Erro ao carregar estoque" description={error} /></div> : null}
          {!loading && !error && filtered.length === 0 ? (
            <div className="mt-6"><EmptyState title="Nenhum veículo no estoque" description="Cadastre veículos para começar a medir giro, preço e margem." /></div>
          ) : null}
          {filtered.length > 0 ? (
            <div className="mt-6">
              <Table>
                <thead><tr><Th>Veículo</Th><Th>Ano</Th><Th>Preço</Th><Th>Status</Th><Th>Anúncio</Th></tr></thead>
                <tbody>
                  {filtered.map((veiculo) => (
                    <tr key={veiculo.id}>
                      <Td>{veiculo.title || `${veiculo.brand || ""} ${veiculo.model || ""}`}</Td>
                      <Td>{veiculo.year || "-"}</Td>
                      <Td>{formatCurrency(veiculo.price)}</Td>
                      <Td><Badge tone="green">{veiculo.status || "available"}</Badge></Td>
                      <Td>{veiculo.ad_status || "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
