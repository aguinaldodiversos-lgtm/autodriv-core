"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { createVeiculo, listVeiculos, updateVeiculo } from "@/lib/api/veiculos";
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

const currentYear = new Date().getFullYear();

const initialForm = {
  brand: "",
  model: "",
  year: String(currentYear),
  price: "",
  fipe_price: "",
  purchase_price: "",
  acquisition_cost: "",
  acquisition_source: "",
  preparation_cost_estimate: "",
  preparation_cost_actual: "",
  status: "available",
  preparation_status: "not_started",
  ad_status: "draft",
  ad_quality_score: "0"
};

type VehicleForm = typeof initialForm;

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildVehicleName(veiculo: Veiculo) {
  return veiculo.title || [veiculo.brand, veiculo.model, veiculo.year].filter(Boolean).join(" ") || "Veiculo sem nome";
}

function getTotalCost(veiculo: Veiculo) {
  return (
    numberValue(veiculo.purchase_price) +
    numberValue(veiculo.acquisition_cost) +
    numberValue(veiculo.preparation_cost_actual)
  );
}

function getExpectedMargin(veiculo: Veiculo) {
  return numberValue(veiculo.price) - getTotalCost(veiculo);
}

function formFromVehicle(veiculo: Veiculo): VehicleForm {
  return {
    brand: veiculo.brand || "",
    model: veiculo.model || "",
    year: String(veiculo.year || currentYear),
    price: veiculo.price == null ? "" : String(veiculo.price),
    fipe_price: veiculo.fipe_price == null ? "" : String(veiculo.fipe_price),
    purchase_price: veiculo.purchase_price == null ? "" : String(veiculo.purchase_price),
    acquisition_cost: veiculo.acquisition_cost == null ? "" : String(veiculo.acquisition_cost),
    acquisition_source: veiculo.acquisition_source || "",
    preparation_cost_estimate: veiculo.preparation_cost_estimate == null ? "" : String(veiculo.preparation_cost_estimate),
    preparation_cost_actual: veiculo.preparation_cost_actual == null ? "" : String(veiculo.preparation_cost_actual),
    status: veiculo.status || "available",
    preparation_status: veiculo.preparation_status || "not_started",
    ad_status: veiculo.ad_status || "draft",
    ad_quality_score: String(veiculo.ad_quality_score || 0)
  };
}

function statusTone(status: string | null | undefined) {
  if (status === "sold") return "blue";
  if (status === "reserved") return "amber";
  if (status === "preparation") return "slate";
  return "green";
}

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
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

  const metrics = useMemo(() => {
    const totalValue = veiculos.reduce((sum, veiculo) => sum + numberValue(veiculo.price), 0);
    const totalCost = veiculos.reduce((sum, veiculo) => sum + getTotalCost(veiculo), 0);
    const available = veiculos.filter((veiculo) => veiculo.status !== "sold").length;

    return {
      total: veiculos.length,
      available,
      totalValue,
      expectedMargin: totalValue - totalCost
    };
  }, [veiculos]);

  function updateField(field: keyof VehicleForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditingVehicleId(null);
    setForm(initialForm);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(veiculo: Veiculo) {
    setEditingVehicleId(veiculo.id);
    setForm(formFromVehicle(veiculo));
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingVehicleId(null);
    setForm(initialForm);
    setFormError(null);
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
      preparation_status: form.preparation_status,
      preparation_cost_estimate: toNumberOrNull(form.preparation_cost_estimate),
      preparation_cost_actual: toNumberOrNull(form.preparation_cost_actual),
      status: form.status,
      ad_status: form.ad_status,
      ad_quality_score: Number(form.ad_quality_score || 0)
    };
  }

  async function onSubmitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const year = Number(form.year);
    if (!form.brand.trim() || !form.model.trim() || !Number.isInteger(year)) {
      setFormError("Informe marca, modelo e ano valido para salvar o veiculo.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingVehicleId) {
        const updated = await updateVeiculo(editingVehicleId, buildPayload());
        setVeiculos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createVeiculo(buildPayload());
        setVeiculos((current) => [created, ...current]);
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel salvar o veiculo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Veiculos</h1>
          <p className="mt-1 text-sm text-slate-500">Estoque, preco, custos e margem prevista por carro.</p>
        </div>
        <PermissionGate permission="veiculos:create">
          <Button type="button" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Cadastrar veiculo
          </Button>
        </PermissionGate>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><p className="text-sm text-slate-500">Total em estoque</p><p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.total}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-slate-500">Disponiveis</p><p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.available}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-slate-500">Valor anunciado</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(metrics.totalValue)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-slate-500">Margem prevista</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(metrics.expectedMargin)}</p></CardContent></Card>
      </section>

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
                <thead>
                  <tr>
                    <Th>Veiculo</Th>
                    <Th>Ano</Th>
                    <Th>Preco</Th>
                    <Th>Custo total</Th>
                    <Th>Margem</Th>
                    <Th>Status</Th>
                    <Th>Anuncio</Th>
                    <Th>Acoes</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((veiculo) => {
                    const margin = getExpectedMargin(veiculo);
                    return (
                      <tr key={veiculo.id}>
                        <Td>
                          <div>
                            <p className="font-medium text-slate-950">{buildVehicleName(veiculo)}</p>
                            <p className="text-xs text-slate-500">{veiculo.acquisition_source || "Origem nao informada"}</p>
                          </div>
                        </Td>
                        <Td>{veiculo.year || "-"}</Td>
                        <Td>{formatCurrency(veiculo.price)}</Td>
                        <Td>{formatCurrency(getTotalCost(veiculo))}</Td>
                        <Td><span className={margin >= 0 ? "text-emerald-700" : "text-red-700"}>{formatCurrency(margin)}</span></Td>
                        <Td><Badge tone={statusTone(veiculo.status)}>{veiculo.status || "available"}</Badge></Td>
                        <Td>{veiculo.ad_status || "-"}</Td>
                        <Td>
                          <PermissionGate permission="veiculos:update">
                            <Button type="button" variant="secondary" size="sm" onClick={() => openEditModal(veiculo)}>
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                          </PermissionGate>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} title={editingVehicleId ? "Editar veiculo" : "Cadastrar veiculo"} onClose={closeModal}>
        <form className="space-y-5" onSubmit={onSubmitVehicle}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Marca" value={form.brand} onChange={(event) => updateField("brand", event.target.value)} required />
            <Input label="Modelo" value={form.model} onChange={(event) => updateField("model", event.target.value)} required />
            <Input label="Ano" type="number" min="1900" max="2100" value={form.year} onChange={(event) => updateField("year", event.target.value)} required />
            <Input label="Preco de venda" inputMode="decimal" value={form.price} onChange={(event) => updateField("price", event.target.value)} placeholder="95000" />
            <Input label="FIPE" inputMode="decimal" value={form.fipe_price} onChange={(event) => updateField("fipe_price", event.target.value)} placeholder="93000" />
            <Input label="Custo de compra" inputMode="decimal" value={form.purchase_price} onChange={(event) => updateField("purchase_price", event.target.value)} />
            <Input label="Custo adicional" inputMode="decimal" value={form.acquisition_cost} onChange={(event) => updateField("acquisition_cost", event.target.value)} />
            <Input label="Origem" value={form.acquisition_source} onChange={(event) => updateField("acquisition_source", event.target.value)} placeholder="Troca, compra direta, repasse" />
            <Input label="Preparacao estimada" inputMode="decimal" value={form.preparation_cost_estimate} onChange={(event) => updateField("preparation_cost_estimate", event.target.value)} />
            <Input label="Preparacao realizada" inputMode="decimal" value={form.preparation_cost_actual} onChange={(event) => updateField("preparation_cost_actual", event.target.value)} />
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
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
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
