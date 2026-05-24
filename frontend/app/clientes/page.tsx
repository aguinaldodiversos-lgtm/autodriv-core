"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { listClientes } from "@/lib/api/clientes";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import type { Cliente } from "@/types/cliente";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listClientes()
      .then(setClientes)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar clientes."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return clientes.filter((cliente) =>
      [cliente.name, cliente.phone, cliente.email, cliente.cpf_cnpj]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [clientes, query]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Base comercial e histórico de relacionamento.</p>
        </div>
        <PermissionGate permission="clientes:create">
          <Button><Plus className="h-4 w-4" /> Novo cliente</Button>
        </PermissionGate>
      </div>
      <Card>
        <CardContent>
          <Input placeholder="Buscar por nome, telefone, email ou documento" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="mt-6 text-sm text-slate-500">Carregando clientes...</p> : null}
          {error ? <div className="mt-6"><EmptyState title="Erro ao carregar clientes" description={error} /></div> : null}
          {!loading && !error && filtered.length === 0 ? (
            <div className="mt-6"><EmptyState title="Nenhum cliente encontrado" description="Cadastre clientes ou ajuste a busca para encontrar registros existentes." /></div>
          ) : null}
          {filtered.length > 0 ? (
            <div className="mt-6">
              <Table>
                <thead><tr><Th>Nome</Th><Th>Telefone</Th><Th>Email</Th><Th>Documento</Th></tr></thead>
                <tbody>
                  {filtered.map((cliente) => (
                    <tr key={cliente.id}>
                      <Td>{cliente.name}</Td>
                      <Td>{cliente.phone || "-"}</Td>
                      <Td>{cliente.email || "-"}</Td>
                      <Td>{cliente.cpf_cnpj || "-"}</Td>
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
