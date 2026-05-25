"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Camera, Pencil, Plus, Wrench } from "lucide-react";
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
import { getFipeValue, listFipeBrands, listFipeModels, listFipeYears } from "@/lib/api/fipe";
import { formatCurrency } from "@/lib/utils/formatters";
import { fuelOptions, getCatalogBrands, getCatalogModels, getYearOptions, transmissionOptions } from "@/lib/vehicles/catalog";
import type { FipeBrand, FipeModel, FipeValue, FipeYear } from "@/types/fipe";
import type { CreateVeiculoPayload, Veiculo } from "@/types/veiculo";

const currentYear = new Date().getFullYear();

const initialForm = {
  brand: "",
  model: "",
  year: String(currentYear),
  fipe_brand_code: "",
  fipe_model_code: "",
  fipe_year_code: "",
  fipe_code: "",
  fipe_reference_month: "",
  license_plate: "",
  version: "",
  color: "",
  fuel: "",
  transmission: "",
  mileage: "",
  price: "",
  fipe_price: "",
  purchase_price: "",
  acquisition_cost: "",
  acquisition_source: "",
  preparation_cost_estimate: "",
  preparation_cost_actual: "",
  repair_notes: "",
  notes: "",
  preparation_items: "",
  image_urls: "",
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
  return veiculo.title || [veiculo.brand, veiculo.model, veiculo.version, veiculo.year].filter(Boolean).join(" ") || "Veiculo sem nome";
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

function preparationItemsToText(items: Veiculo["preparation_items"]) {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => {
      const estimated = item.estimated_cost ? ` | estimado ${item.estimated_cost}` : "";
      const actual = item.actual_cost ? ` | realizado ${item.actual_cost}` : "";
      return `${item.description || ""}${estimated}${actual}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function parsePreparationItems(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [description, estimatedRaw, actualRaw] = line.split("|").map((part) => part.trim());
      return {
        description,
        estimated_cost: toNumberOrNull((estimatedRaw || "").replace(/estimado/i, "")),
        actual_cost: toNumberOrNull((actualRaw || "").replace(/realizado/i, "")),
        status: "pending"
      };
    });
}

function imageUrlsFromText(value: string) {
  return value
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

function formFromVehicle(veiculo: Veiculo): VehicleForm {
  return {
    brand: veiculo.brand || "",
    model: veiculo.model || "",
    year: String(veiculo.year || currentYear),
    fipe_brand_code: veiculo.fipe_brand_code || "",
    fipe_model_code: veiculo.fipe_model_code || "",
    fipe_year_code: veiculo.fipe_year_code || "",
    fipe_code: veiculo.fipe_code || "",
    fipe_reference_month: veiculo.fipe_reference_month || "",
    license_plate: veiculo.license_plate || "",
    version: veiculo.version || "",
    color: veiculo.color || "",
    fuel: veiculo.fuel || "",
    transmission: veiculo.transmission || "",
    mileage: veiculo.mileage == null ? "" : String(veiculo.mileage),
    price: veiculo.price == null ? "" : String(veiculo.price),
    fipe_price: veiculo.fipe_price == null ? "" : String(veiculo.fipe_price),
    purchase_price: veiculo.purchase_price == null ? "" : String(veiculo.purchase_price),
    acquisition_cost: veiculo.acquisition_cost == null ? "" : String(veiculo.acquisition_cost),
    acquisition_source: veiculo.acquisition_source || "",
    preparation_cost_estimate: veiculo.preparation_cost_estimate == null ? "" : String(veiculo.preparation_cost_estimate),
    preparation_cost_actual: veiculo.preparation_cost_actual == null ? "" : String(veiculo.preparation_cost_actual),
    repair_notes: veiculo.repair_notes || "",
    notes: veiculo.notes || "",
    preparation_items: preparationItemsToText(veiculo.preparation_items),
    image_urls: (veiculo.images || []).map((image) => image.image_url).join("\n"),
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
  const [fipeBrands, setFipeBrands] = useState<FipeBrand[]>([]);
  const [fipeModels, setFipeModels] = useState<FipeModel[]>([]);
  const [fipeYears, setFipeYears] = useState<FipeYear[]>([]);
  const [fipeStatus, setFipeStatus] = useState<string | null>(null);
  const [isFipeLoading, setIsFipeLoading] = useState(false);

  useEffect(() => {
    listVeiculos()
      .then(setVeiculos)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar veiculos."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isModalOpen || fipeBrands.length > 0) return;

    setIsFipeLoading(true);
    setFipeStatus("Carregando marcas da FIPE...");
    listFipeBrands()
      .then((brands) => {
        setFipeBrands(brands);
        setFipeStatus(null);
      })
      .catch((err) => {
        setFipeStatus(err instanceof Error ? err.message : "Nao foi possivel carregar a FIPE.");
      })
      .finally(() => setIsFipeLoading(false));
  }, [fipeBrands.length, isModalOpen]);

  const brandOptions = useMemo(() => getCatalogBrands(veiculos.map((veiculo) => veiculo.brand)), [veiculos]);
  const modelOptions = useMemo(
    () => getCatalogModels(form.brand, veiculos.filter((veiculo) => veiculo.brand === form.brand).map((veiculo) => veiculo.model)),
    [form.brand, veiculos]
  );
  const yearOptions = useMemo(() => getYearOptions(), []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return veiculos.filter((veiculo) =>
      [veiculo.title, veiculo.brand, veiculo.model, veiculo.version, veiculo.license_plate, veiculo.status, veiculo.ad_status]
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
    setForm((current) => {
      const next = { ...current, [field]: value };
      const matchingFipe = veiculos.find(
        (veiculo) =>
          veiculo.brand?.toLowerCase() === next.brand.toLowerCase() &&
          veiculo.model?.toLowerCase() === next.model.toLowerCase() &&
          Number(veiculo.year) === Number(next.year) &&
          veiculo.fipe_price
      );
      if (["brand", "model", "year"].includes(field) && matchingFipe && !next.fipe_price) {
        next.fipe_price = String(matchingFipe.fipe_price);
      }
      return next;
    });
  }

  async function selectFipeBrand(code: string) {
    const selected = fipeBrands.find((brand) => brand.code === code);
    setForm((current) => ({
      ...current,
      fipe_brand_code: code,
      fipe_model_code: "",
      fipe_year_code: "",
      fipe_code: "",
      fipe_reference_month: "",
      brand: selected?.name || current.brand,
      model: "",
      year: current.year,
      fipe_price: ""
    }));
    setFipeModels([]);
    setFipeYears([]);
    if (!code) return;

    setIsFipeLoading(true);
    setFipeStatus("Carregando modelos da FIPE...");
    try {
      const response = await listFipeModels(code);
      setFipeModels(response.models);
      setFipeStatus(null);
    } catch (err) {
      setFipeStatus(err instanceof Error ? err.message : "Nao foi possivel carregar modelos FIPE.");
    } finally {
      setIsFipeLoading(false);
    }
  }

  async function selectFipeModel(code: string) {
    const selected = fipeModels.find((model) => model.code === code);
    setForm((current) => ({
      ...current,
      fipe_model_code: code,
      fipe_year_code: "",
      fipe_code: "",
      fipe_reference_month: "",
      model: selected?.name || current.model,
      fipe_price: ""
    }));
    setFipeYears([]);
    if (!form.fipe_brand_code || !code) return;

    setIsFipeLoading(true);
    setFipeStatus("Carregando anos da FIPE...");
    try {
      const years = await listFipeYears(form.fipe_brand_code, code);
      setFipeYears(years);
      setFipeStatus(null);
    } catch (err) {
      setFipeStatus(err instanceof Error ? err.message : "Nao foi possivel carregar anos FIPE.");
    } finally {
      setIsFipeLoading(false);
    }
  }

  function applyFipeValue(value: FipeValue, yearCode: string) {
    setForm((current) => ({
      ...current,
      fipe_year_code: yearCode,
      fipe_code: value.fipe_code || "",
      fipe_reference_month: value.reference_month || "",
      brand: value.brand || current.brand,
      model: value.model || current.model,
      year: value.year_model ? String(value.year_model) : current.year,
      fuel: value.fuel || current.fuel,
      fipe_price: value.value ? String(value.value) : current.fipe_price
    }));
  }

  async function selectFipeYear(code: string) {
    setForm((current) => ({ ...current, fipe_year_code: code }));
    if (!form.fipe_brand_code || !form.fipe_model_code || !code) return;

    setIsFipeLoading(true);
    setFipeStatus("Consultando valor FIPE...");
    try {
      const value = await getFipeValue(form.fipe_brand_code, form.fipe_model_code, code);
      applyFipeValue(value, code);
      setFipeStatus(value.raw_value ? `FIPE encontrada: ${value.raw_value}` : "Referencia FIPE carregada.");
    } catch (err) {
      setFipeStatus(err instanceof Error ? err.message : "Nao foi possivel consultar valor FIPE.");
    } finally {
      setIsFipeLoading(false);
    }
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
      fipe_brand_code: form.fipe_brand_code || null,
      fipe_model_code: form.fipe_model_code || null,
      fipe_year_code: form.fipe_year_code || null,
      fipe_code: form.fipe_code || null,
      fipe_reference_month: form.fipe_reference_month || null,
      license_plate: form.license_plate.trim() || null,
      version: form.version.trim() || null,
      color: form.color.trim() || null,
      fuel: form.fuel.trim() || null,
      transmission: form.transmission.trim() || null,
      mileage: toNumberOrNull(form.mileage),
      price: toNumberOrNull(form.price),
      fipe_price: toNumberOrNull(form.fipe_price),
      purchase_price: toNumberOrNull(form.purchase_price),
      acquisition_cost: toNumberOrNull(form.acquisition_cost),
      acquisition_source: form.acquisition_source.trim() || null,
      preparation_status: form.preparation_status,
      preparation_cost_estimate: toNumberOrNull(form.preparation_cost_estimate),
      preparation_cost_actual: toNumberOrNull(form.preparation_cost_actual),
      repair_notes: form.repair_notes.trim() || null,
      notes: form.notes.trim() || null,
      preparation_items: parsePreparationItems(form.preparation_items),
      image_urls: imageUrlsFromText(form.image_urls),
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
          <p className="mt-1 text-sm text-slate-500">Cadastro completo com FIPE, fotos, reparos, preparacao e margem.</p>
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
          <Input placeholder="Buscar por modelo, marca, placa ou status" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="mt-6 text-sm text-slate-500">Carregando estoque...</p> : null}
          {error ? <div className="mt-6"><EmptyState title="Erro ao carregar estoque" description={error} /></div> : null}
          {!loading && !error && filtered.length === 0 ? (
            <div className="mt-6"><EmptyState title="Nenhum veiculo no estoque" description="Cadastre veiculos para medir giro, preco, reparos e margem." /></div>
          ) : null}
          {filtered.length > 0 ? (
            <div className="mt-6">
              <Table>
                <thead>
                  <tr>
                    <Th>Veiculo</Th>
                    <Th>Placa/KM</Th>
                    <Th>Preco</Th>
                    <Th>Custo total</Th>
                    <Th>Margem</Th>
                    <Th>Fotos</Th>
                    <Th>Status</Th>
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
                        <Td>{veiculo.license_plate || "-"}<br /><span className="text-xs text-slate-500">{veiculo.mileage ? `${veiculo.mileage} km` : "KM nao informado"}</span></Td>
                        <Td>{formatCurrency(veiculo.price)}</Td>
                        <Td>{formatCurrency(getTotalCost(veiculo))}</Td>
                        <Td><span className={margin >= 0 ? "text-emerald-700" : "text-red-700"}>{formatCurrency(margin)}</span></Td>
                        <Td>{veiculo.images?.length || 0}</Td>
                        <Td><Badge tone={statusTone(veiculo.status)}>{veiculo.status || "available"}</Badge></Td>
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
        <form className="space-y-6" onSubmit={onSubmitVehicle}>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-950">Identificacao e catalogo</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Marca FIPE</span>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.fipe_brand_code} onChange={(event) => selectFipeBrand(event.target.value)}>
                  <option value="">Selecionar marca</option>
                  {fipeBrands.map((brand) => <option key={brand.code} value={brand.code}>{brand.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Modelo FIPE</span>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.fipe_model_code} onChange={(event) => selectFipeModel(event.target.value)} disabled={!form.fipe_brand_code || isFipeLoading}>
                  <option value="">Selecionar modelo</option>
                  {fipeModels.map((model) => <option key={model.code} value={model.code}>{model.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Ano/combustivel FIPE</span>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.fipe_year_code} onChange={(event) => selectFipeYear(event.target.value)} disabled={!form.fipe_model_code || isFipeLoading}>
                  <option value="">Selecionar ano</option>
                  {fipeYears.map((year) => <option key={year.code} value={year.code}>{year.name}</option>)}
                </select>
              </label>
              <Input label="FIPE" inputMode="decimal" value={form.fipe_price} onChange={(event) => updateField("fipe_price", event.target.value)} placeholder="Carregada pela FIPE ou manual" />
              <Input label="Marca cadastrada" list="vehicle-brand-options" value={form.brand} onChange={(event) => updateField("brand", event.target.value)} required />
              <Input label="Modelo cadastrado" list="vehicle-model-options" value={form.model} onChange={(event) => updateField("model", event.target.value)} required />
              <Input label="Ano/modelo" list="vehicle-year-options" value={form.year} onChange={(event) => updateField("year", event.target.value)} required />
              <Input label="Versao" value={form.version} onChange={(event) => updateField("version", event.target.value)} placeholder="EXL 2.0, LTZ, Comfortline..." />
              <Input label="Placa" value={form.license_plate} onChange={(event) => updateField("license_plate", event.target.value.toUpperCase())} />
              <Input label="Quilometragem" inputMode="numeric" value={form.mileage} onChange={(event) => updateField("mileage", event.target.value)} />
              <Input label="Cor" value={form.color} onChange={(event) => updateField("color", event.target.value)} />
              <Input label="Combustivel" list="vehicle-fuel-options" value={form.fuel} onChange={(event) => updateField("fuel", event.target.value)} />
              <Input label="Cambio" list="vehicle-transmission-options" value={form.transmission} onChange={(event) => updateField("transmission", event.target.value)} />
            </div>
            <datalist id="vehicle-brand-options">{brandOptions.map((brand) => <option key={brand} value={brand} />)}</datalist>
            <datalist id="vehicle-model-options">{modelOptions.map((model) => <option key={model} value={model} />)}</datalist>
            <datalist id="vehicle-year-options">{yearOptions.map((year) => <option key={year} value={year} />)}</datalist>
            <datalist id="vehicle-fuel-options">{fuelOptions.map((fuel) => <option key={fuel} value={fuel} />)}</datalist>
            <datalist id="vehicle-transmission-options">{transmissionOptions.map((item) => <option key={item} value={item} />)}</datalist>
            <p className="mt-2 text-xs text-slate-500">
              {fipeStatus || "Selecione marca, modelo e ano para buscar a FIPE automaticamente. Se a API estiver indisponivel, os campos cadastrados continuam editaveis."}
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-950">Preco, compra e preparacao</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Preco de venda" inputMode="decimal" value={form.price} onChange={(event) => updateField("price", event.target.value)} placeholder="95000" />
              <Input label="Custo de compra" inputMode="decimal" value={form.purchase_price} onChange={(event) => updateField("purchase_price", event.target.value)} />
              <Input label="Custo adicional" inputMode="decimal" value={form.acquisition_cost} onChange={(event) => updateField("acquisition_cost", event.target.value)} />
              <Input label="Origem" value={form.acquisition_source} onChange={(event) => updateField("acquisition_source", event.target.value)} placeholder="Troca, compra direta, repasse" />
              <Input label="Preparacao estimada" inputMode="decimal" value={form.preparation_cost_estimate} onChange={(event) => updateField("preparation_cost_estimate", event.target.value)} />
              <Input label="Preparacao realizada" inputMode="decimal" value={form.preparation_cost_actual} onChange={(event) => updateField("preparation_cost_actual", event.target.value)} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 flex items-center gap-2"><Wrench className="h-4 w-4" /> Reparos e preparacao</span>
              <textarea className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.repair_notes} onChange={(event) => updateField("repair_notes", event.target.value)} placeholder="Ex: pintar parachoque, trocar pneus, higienizacao interna..." />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Itens de gasto, um por linha</span>
              <textarea className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.preparation_items} onChange={(event) => updateField("preparation_items", event.target.value)} placeholder="Pneus | estimado 1800 | realizado 1650&#10;Funilaria | estimado 900" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 flex items-center gap-2"><Camera className="h-4 w-4" /> Fotos por URL</span>
              <textarea className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.image_urls} onChange={(event) => updateField("image_urls", event.target.value)} placeholder="Cole uma URL por linha. O upload direto fica como proxima evolucao." />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 block">Observacoes internas</span>
              <textarea className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Historico, documentacao, restricoes ou pontos de atencao." />
            </label>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
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
          </section>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar veiculo"}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
