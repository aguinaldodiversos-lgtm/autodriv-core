"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { createVeiculo, listVeiculos } from "@/lib/api/veiculos";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Td, Th } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils/formatters";
import type { CreateVeiculoPayload, Veiculo } from "@/types/veiculo";

const initialForm = {
  brand: "",
  model: "",
  year: String(new Date().getFullYear()),
  price: "",
  fipe_price: "",
  purchase_price: "",
  acquisition_cost: "",
  acquisition_source: "",
  status: "available",
  preparation_status: "not_started",
  ad_status: "draft",
  ad_quality_score: "0"
};

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    listVeiculos()
      .then(setVeiculos)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar veiculos."))
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

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload(): CreateVeiculoPayload {
    return {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      price: toNumberOrNull(form.price),
      fipe_price: toNumberOrNull(form.fipe_price),
      purchase_price: toNumberOrNull(form.purchase_price),
      acquisition_cost: toNumberOrNull(form.acquisition_cost),
      acquisition_source: form.acquisition_source.trim() || null,
      status: form.status,
      preparation_status: form.preparation_status,
      ad_status: form.ad_status,
      ad_quality_score: Number(form.ad_quality_score || 0)
    };
  }

  async function onCreateVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const year = Number(form.year);
    if (!form.brand.trim() || !form.model.trim() || !Number.isInteger(year)) {
      setFormError("Informe marca, modelo e ano valido para cadastrar o veiculo.");
      return;
    }

    setIsSaving(true);
    try {
      const created = await createVeiculo(buildPayload());
      setVeiculos((current) => [created, ...current]);
      setForm(initialForm);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel cadastrar o veiculo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Veiculos</h1>
          <p className="mt-1 text-sm text-slate-500">Estoque, preco, status e qualidade comercial.</p>
        </div>
        <PermissionGate permission="veiculos:create">
          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" /> Cadastrar veiculo
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent>
          <Input placeholder="Buscar por modelo, marca ou status" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="mt-6 text-sm text-slate-500">Carregando estoque...</p> : null}
          {error ? <div className="mt-6"><EmptyState title="Erro ao carregar estoque" description={error} /></div> : null}
          {!loading && !error && filtered.length === 0 ? (
            <div className="mt-6"><EmptyState title="Nenhum veiculo no estoque" description="Cadastre veiculos para comecar a medir giro, preco e margem." /></div>
          ) : null}
          {filtered.length > 0 ? (
            <div className="mt-6">
              <Table>
                <thead><tr><Th>Veiculo</Th><Th>Ano</Th><Th>Preco</Th><Th>Status</Th><Th>Anuncio</Th></tr></thead>
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

      <Modal open={isModalOpen} title="Cadastrar veiculo" onClose={() => setIsModalOpen(false)}>
        <form className="space-y-5" onSubmit={onCreateVehicle}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Marca" value={form.brand} onChange={(event) => updateField("brand", event.target.value)} required />
            <Input label="Modelo" value={form.model} onChange={(event) => updateField("model", event.target.value)} required />
            <Input label="Ano" type="number" min="1900" max="2100" value={form.year} onChange={(event) => updateField("year", event.target.value)} required />
            <Input label="Preco de venda" inputMode="decimal" value={form.price} onChange={(event) => updateField("price", event.target.value)} placeholder="95000" />
            <Input label="FIPE" inputMode="decimal" value={form.fipe_price} onChange={(event) => updateField("fipe_price", event.target.value)} placeholder="93000" />
            <Input label="Custo de compra" inputMode="decimal" value={form.purchase_price} onChange={(event) => updateField("purchase_price", event.target.value)} />
            <Input label="Custo adicional" inputMode="decimal" value={form.acquisition_cost} onChange={(event) => updateField("acquisition_cost", event.target.value)} />
            <Input label="Origem" value={form.acquisition_source} onChange={(event) => updateField("acquisition_source", event.target.value)} placeholder="Troca, compra direta, repasse" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Status</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="available">Disponivel</option>
                <option value="reserved">Reservado</option>
                <option value="sold">Vendido</option>
                <option value="preparation">Preparacao</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Preparacao</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.preparation_status} onChange={(event) => updateField("preparation_status", event.target.value)}>
                <option value="not_started">Nao iniciada</option>
                <option value="in_progress">Em andamento</option>
                <option value="done">Concluida</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Anuncio</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.ad_status} onChange={(event) => updateField("ad_status", event.target.value)}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="paused">Pausado</option>
                <option value="needs_review">Revisar</option>
              </select>
            </label>

            <Input label="Qualidade do anuncio (0 a 100)" type="number" min="0" max="100" value={form.ad_quality_score} onChange={(event) => updateField("ad_quality_score", event.target.value)} />
          </div>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar veiculo"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
