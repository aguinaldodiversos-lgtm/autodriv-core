"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, CircleDollarSign, Plus } from "lucide-react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Td, Th } from "@/components/ui/Table";
import { createFinanceEntry, getFinanceSummary, listFinanceEntries, markFinanceEntryAsPaid } from "@/lib/api/financeiro";
import { listVeiculos } from "@/lib/api/veiculos";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { CreateFinanceEntryPayload, FinanceEntry, FinanceEntryType, FinanceSummary } from "@/types/financeiro";
import type { Veiculo } from "@/types/veiculo";

const initialForm = {
  type: "income" as FinanceEntryType,
  category: "",
  description: "",
  amount: "",
  due_date: "",
  status: "pending",
  vehicle_id: "",
  notes: ""
};

function toNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildVehicleName(veiculo: Veiculo) {
  return veiculo.title || [veiculo.brand, veiculo.model, veiculo.year].filter(Boolean).join(" ") || `Veiculo #${veiculo.id}`;
}

function entryTone(entry: FinanceEntry) {
  if (entry.status === "paid") return "green";
  if (entry.due_date && new Date(entry.due_date) < new Date()) return "red";
  return entry.type === "income" ? "blue" : "amber";
}

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadFinance() {
    setLoading(true);
    setError(null);
    try {
      const [entryData, summaryData, vehicleData] = await Promise.all([
        listFinanceEntries(),
        getFinanceSummary(),
        listVeiculos()
      ]);
      setEntries(entryData);
      setSummary(summaryData);
      setVehicles(vehicleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o financeiro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinance();
  }, []);

  const pendingEntries = useMemo(() => entries.filter((entry) => entry.status === "pending"), [entries]);
  const paidEntries = useMemo(() => entries.filter((entry) => entry.status === "paid"), [entries]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
    setForm(initialForm);
    setFormError(null);
  }

  function buildPayload(): CreateFinanceEntryPayload {
    return {
      type: form.type,
      category: form.category.trim() || null,
      description: form.description.trim(),
      amount: toNumber(form.amount),
      due_date: form.due_date || null,
      status: form.status as CreateFinanceEntryPayload["status"],
      vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
      notes: form.notes.trim() || null
    };
  }

  async function onCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.description.trim() || toNumber(form.amount) <= 0) {
      setFormError("Informe descricao e valor valido para o lancamento.");
      return;
    }

    setIsSaving(true);
    try {
      await createFinanceEntry(buildPayload());
      closeModal();
      await loadFinance();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel criar o lancamento.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onPay(entry: FinanceEntry) {
    setPayingId(entry.id);
    setError(null);
    try {
      await markFinanceEntryAsPaid(entry.id);
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel marcar como pago.");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500">Fluxo de caixa, contas e margem conectada ao estoque.</p>
        </div>
        <PermissionGate permission="financeiro:create">
          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" /> Novo lancamento
          </Button>
        </PermissionGate>
      </div>

      {loading ? <p className="text-sm text-slate-500">Carregando financeiro...</p> : null}
      {error ? <div className="mb-6"><EmptyState title="Erro no financeiro" description={error} /></div> : null}

      {summary ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent><p className="text-sm text-slate-500">Saldo realizado</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.current_balance)}</p></CardContent></Card>
            <Card><CardContent><p className="text-sm text-slate-500">Saldo projetado</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.projected_balance)}</p></CardContent></Card>
            <Card><CardContent><p className="text-sm text-slate-500">A receber</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.pending_income)}</p></CardContent></Card>
            <Card><CardContent><p className="text-sm text-slate-500">Vencidos</p><p className="mt-2 text-2xl font-semibold text-red-700">{formatCurrency(summary.overdue_amount)}</p></CardContent></Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Contas em aberto</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingEntries.length === 0 ? (
                  <EmptyState title="Nenhuma conta em aberto" description="Lancamentos pendentes aparecerao aqui." icon={<CircleDollarSign className="h-6 w-6" />} />
                ) : (
                  <Table>
                    <thead><tr><Th>Descricao</Th><Th>Tipo</Th><Th>Valor</Th><Th>Vencimento</Th><Th>Status</Th><Th>Acao</Th></tr></thead>
                    <tbody>
                      {pendingEntries.map((entry) => (
                        <tr key={entry.id}>
                          <Td>
                            <div>
                              <p className="font-medium text-slate-950">{entry.description}</p>
                              <p className="text-xs text-slate-500">{entry.vehicle_title || entry.category || "Sem vinculo"}</p>
                            </div>
                          </Td>
                          <Td>{entry.type === "income" ? "Receita" : "Despesa"}</Td>
                          <Td>{formatCurrency(entry.amount)}</Td>
                          <Td>{formatDate(entry.due_date)}</Td>
                          <Td><Badge tone={entryTone(entry)}>{entry.status}</Badge></Td>
                          <Td>
                            <PermissionGate permission="financeiro:update">
                              <Button type="button" size="sm" variant="secondary" onClick={() => onPay(entry)} disabled={payingId === entry.id}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Baixar
                              </Button>
                            </PermissionGate>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margem por veiculo</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.vehicle_profitability.length === 0 ? (
                  <p className="text-sm text-slate-500">Cadastre veiculos com custo e preco para acompanhar margem.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.vehicle_profitability.slice(0, 8).map((vehicle) => (
                      <div key={vehicle.id} className="rounded-md border border-slate-100 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-950">{vehicle.title || `${vehicle.brand || ""} ${vehicle.model || ""}`}</p>
                            <p className="text-xs text-slate-500">Custo {formatCurrency(vehicle.total_cost)} - Receita {formatCurrency(vehicle.expected_income)}</p>
                          </div>
                          <span className={vehicle.expected_margin >= 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-red-700"}>
                            {formatCurrency(vehicle.expected_margin)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Historico recente</CardTitle>
            </CardHeader>
            <CardContent>
              {paidEntries.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum lancamento baixado ainda.</p>
              ) : (
                <Table>
                  <thead><tr><Th>Descricao</Th><Th>Tipo</Th><Th>Valor</Th><Th>Pagamento</Th><Th>Categoria</Th></tr></thead>
                  <tbody>
                    {paidEntries.slice(0, 20).map((entry) => (
                      <tr key={entry.id}>
                        <Td>{entry.description}</Td>
                        <Td>{entry.type === "income" ? "Receita" : "Despesa"}</Td>
                        <Td>{formatCurrency(entry.amount)}</Td>
                        <Td>{formatDate(entry.paid_date)}</Td>
                        <Td>{entry.category || "-"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Modal open={isModalOpen} title="Novo lancamento financeiro" onClose={closeModal}>
        <form className="space-y-5" onSubmit={onCreateEntry}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Tipo</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.type} onChange={(event) => updateField("type", event.target.value)}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </label>

            <Input label="Categoria" value={form.category} onChange={(event) => updateField("category", event.target.value)} placeholder="Venda, preparacao, anuncio" />
            <Input label="Descricao" value={form.description} onChange={(event) => updateField("description", event.target.value)} required />
            <Input label="Valor" inputMode="decimal" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} required />
            <Input label="Vencimento" type="date" value={form.due_date} onChange={(event) => updateField("due_date", event.target.value)} />

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Status</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 block">Veiculo vinculado</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.vehicle_id} onChange={(event) => updateField("vehicle_id", event.target.value)}>
                <option value="">Sem vinculo</option>
                {vehicles.map((veiculo) => (
                  <option key={veiculo.id} value={veiculo.id}>{buildVehicleName(veiculo)}</option>
                ))}
              </select>
            </label>
          </div>

          <Input label="Observacoes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar lancamento"}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
