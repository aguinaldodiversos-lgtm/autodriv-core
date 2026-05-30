"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Handshake, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { acceptProposta, listPropostas } from "@/lib/api/propostas";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Proposta } from "@/types/proposta";

const statusLabels: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  accepted: "Aceita",
  rejected: "Recusada",
  lost: "Perdida"
};

function statusVariant(status?: string | null): "neutral" | "success" | "danger" | "warning" {
  if (status === "accepted") return "success";
  if (status === "rejected" || status === "lost") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function vehicleLabel(proposta: Proposta) {
  return (
    proposta.vehicle_title ||
    [proposta.vehicle_brand, proposta.vehicle_model, proposta.vehicle_year].filter(Boolean).join(" ") ||
    "Veiculo nao vinculado"
  );
}

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Proposta | null>(null);
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPropostas()
      .then(setPropostas)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return propostas;

    return propostas.filter((proposta) =>
      [
        proposta.id,
        proposta.client_name,
        proposta.client_phone,
        proposta.vehicle_title,
        proposta.vehicle_brand,
        proposta.vehicle_model,
        proposta.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [propostas, query]);

  const openAcceptModal = (proposta: Proposta) => {
    setSelected(proposta);
    setPrice(proposta.price ? String(proposta.price) : "");
    setPaymentMethod(proposta.payment_method || "");
    setNotes(proposta.notes || "");
    setError(null);
  };

  const handleAccept = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await acceptProposta(selected.id, {
        price: price ? Number(price) : null,
        payment_method: paymentMethod || null,
        notes: notes || null
      });
      setPropostas((current) =>
        current.map((item) => (item.id === selected.id ? { ...item, ...result.proposal } : item))
      );
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel aceitar a proposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const accepted = propostas.filter((item) => item.status === "accepted").length;
    const open = propostas.filter((item) => item.status !== "accepted" && item.status !== "rejected" && item.status !== "lost").length;
    const totalOpenValue = propostas
      .filter((item) => item.status !== "accepted" && item.status !== "rejected" && item.status !== "lost")
      .reduce((sum, item) => sum + Number(item.price || 0), 0);

    return { accepted, open, totalOpenValue };
  }, [propostas]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Propostas</h1>
            <p className="mt-1 text-sm text-slate-500">
              Transforme propostas aceitas em venda e contrato rascunho sem perder rastreabilidade.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-xs font-medium uppercase text-slate-500">Abertas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-medium uppercase text-slate-500">Aceitas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.accepted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-medium uppercase text-slate-500">Valor em aberto</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.totalOpenValue)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex max-w-md items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            aria-label="Buscar proposta"
            placeholder="Buscar por cliente, veiculo ou status"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {error && !selected ? (
          <EmptyState title="Nao foi possivel carregar propostas" description={error} icon={<Handshake className="h-6 w-6" />} />
        ) : isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando propostas...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma proposta encontrada"
            description="Quando o time gerar propostas para leads e clientes, elas aparecerao aqui para virarem contratos."
            icon={<Handshake className="h-6 w-6" />}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((proposta) => {
              const accepted = proposta.status === "accepted" || Boolean(proposta.contract_id);
              return (
                <div
                  key={proposta.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">Proposta #{proposta.id}</p>
                        <Badge variant={statusVariant(proposta.status)}>
                          {statusLabels[proposta.status || ""] || proposta.status || "Aberta"}
                        </Badge>
                        {proposta.contract_status ? <Badge variant="info">Contrato {proposta.contract_status}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{proposta.client_name || "Cliente nao informado"}</p>
                      <p className="mt-1 text-sm text-slate-500">{vehicleLabel(proposta)}</p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[520px]">
                      <div>
                        <p className="text-xs font-medium uppercase text-slate-400">Valor</p>
                        <p className="font-semibold text-slate-950">{formatCurrency(proposta.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-slate-400">Atualizada</p>
                        <p className="font-semibold text-slate-950">{formatDate(proposta.updated_at || proposta.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-slate-400">Responsavel</p>
                        <p className="font-semibold text-slate-950">{proposta.created_by_name || "Equipe"}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {accepted ? (
                        <Button type="button" variant="secondary" disabled>
                          <CheckCircle2 className="h-4 w-4" />
                          Aceita
                        </Button>
                      ) : (
                        <Button type="button" onClick={() => openAcceptModal(proposta)}>
                          <FileText className="h-4 w-4" />
                          Aceitar e gerar contrato
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={Boolean(selected)} title="Aceitar proposta" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{selected.client_name || "Cliente nao informado"}</p>
              <p className="mt-1 text-sm text-slate-500">{vehicleLabel(selected)}</p>
            </div>
            <Input
              label="Valor final"
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <Input
              label="Forma de pagamento"
              placeholder="Ex: financiamento, a vista, troca + financiamento"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            />
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Observacoes do fechamento</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Conforme combinado com o cliente..."
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAccept} disabled={isSubmitting}>
                {isSubmitting ? "Gerando..." : "Gerar venda e contrato"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
