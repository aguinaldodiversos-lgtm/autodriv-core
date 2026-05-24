"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { listLeads } from "@/lib/api/leads";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Lead } from "@/types/lead";

function leadName(lead: Lead) {
  return lead.name || lead.client_name || `Lead #${lead.id}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLeads()
      .then(setLeads)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar leads."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return leads.filter((lead) =>
      [leadName(lead), lead.phone, lead.client_phone, lead.source, lead.origin, lead.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [leads, query]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">Fila comercial, origem e próximos contatos.</p>
        </div>
        <PermissionGate permission="leads:create">
          <Button><Plus className="h-4 w-4" /> Novo lead</Button>
        </PermissionGate>
      </div>
      <Card>
        <CardContent>
          <Input placeholder="Buscar por nome, telefone, origem ou status" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="mt-6 text-sm text-slate-500">Carregando leads...</p> : null}
          {error ? <div className="mt-6"><EmptyState title="Erro ao carregar leads" description={error} /></div> : null}
          {!loading && !error && filtered.length === 0 ? (
            <div className="mt-6"><EmptyState title="Nenhum lead encontrado" description="Quando novos contatos entrarem por site, portais ou WhatsApp, eles aparecerão aqui." /></div>
          ) : null}
          {filtered.length > 0 ? (
            <div className="mt-6">
              <Table>
                <thead><tr><Th>Lead</Th><Th>Status</Th><Th>Origem</Th><Th>Responsável</Th><Th>Próximo contato</Th></tr></thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.id}>
                      <Td>{leadName(lead)}</Td>
                      <Td><Badge tone="blue">{lead.status || "new"}</Badge></Td>
                      <Td>{lead.origin || lead.source || "-"}</Td>
                      <Td>{lead.assigned_user_name || lead.assigned_user_id || "-"}</Td>
                      <Td>{formatDateTime(lead.next_action_at)}</Td>
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
