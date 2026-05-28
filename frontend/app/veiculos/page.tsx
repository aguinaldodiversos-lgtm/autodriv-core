"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Camera, CheckCircle2, FileText, ImagePlus, Pencil, Plus, RefreshCw, Send, Sparkles, Trash2, Wrench } from "lucide-react";
import { createVeiculo, listVeiculos, updateVeiculo } from "@/lib/api/veiculos";
import { uploadVehicleImage } from "@/lib/api/images";
import { getVehicleIntelligence, listStockIntelligence, upsertVehiclePreparationTask } from "@/lib/api/stock-intelligence";
import { generateVehicleAd, listVehicleAds } from "@/lib/api/ads";
import {
  getVehiclePreparation,
  publishVehicle,
  recalculateVehiclePreparation,
  suggestVehicleDescription,
  suggestVehiclePrice,
  suggestVehiclePriority
} from "@/lib/api/ad-preparation";
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
import type { PreparedAd } from "@/types/ad";
import type { AdPreparationCheck, AdPreparationScore, AdPreparationSuggestion } from "@/types/ad-preparation";
import type { FipeBrand, FipeModel, FipeValue, FipeYear } from "@/types/fipe";
import type { StockVehicle, VehicleIntelligence, VehicleIntelligenceDetail, VehiclePreparationTask } from "@/types/stock-intelligence";
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
  documentation_cost: "",
  transport_cost: "",
  commission_cost: "",
  other_costs: "",
  price_strategy: "",
  ad_description: "",
  repair_notes: "",
  notes: "",
  preparation_items: "",
  image_urls: "",
  status: "available",
  documentation_status: "pending",
  documentation_notes: "",
  legal_restriction_status: "clear",
  preparation_status: "not_started",
  ad_status: "draft",
  ad_quality_score: "0"
};

type VehicleForm = typeof initialForm;

const initialPreparationTaskForm = {
  title: "",
  status: "pending" as VehiclePreparationTask["status"],
  estimated_cost: "",
  actual_cost: "",
  supplier: ""
};

type PreparationTaskForm = typeof initialPreparationTaskForm;

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
    numberValue(veiculo.preparation_cost_actual) +
    numberValue(veiculo.documentation_cost) +
    numberValue(veiculo.transport_cost) +
    numberValue(veiculo.commission_cost) +
    numberValue(veiculo.other_costs)
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
    documentation_cost: veiculo.documentation_cost == null ? "" : String(veiculo.documentation_cost),
    transport_cost: veiculo.transport_cost == null ? "" : String(veiculo.transport_cost),
    commission_cost: veiculo.commission_cost == null ? "" : String(veiculo.commission_cost),
    other_costs: veiculo.other_costs == null ? "" : String(veiculo.other_costs),
    price_strategy: veiculo.price_strategy || "",
    ad_description: veiculo.ad_description || "",
    repair_notes: veiculo.repair_notes || "",
    notes: veiculo.notes || "",
    preparation_items: preparationItemsToText(veiculo.preparation_items),
    image_urls: (veiculo.images || []).map((image) => image.image_url).join("\n"),
    status: veiculo.status || "available",
    documentation_status: veiculo.documentation_status || "pending",
    documentation_notes: veiculo.documentation_notes || "",
    legal_restriction_status: veiculo.legal_restriction_status || "clear",
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

function scoreTone(score: number | null | undefined) {
  const value = Number(score || 0);
  if (value >= 80) return "green";
  if (value >= 60) return "amber";
  return "red";
}

function publishTone(canPublish: boolean | null | undefined) {
  return canPublish ? "green" : "red";
}

function preparationStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    blocked: "Bloqueado",
    incomplete: "Incompleto",
    publishable_with_attention: "Publicavel com atencao",
    good: "Bom anuncio",
    excellent: "Excelente"
  };
  return labels[String(status || "")] || status || "Nao calculado";
}

function checkStatusTone(status: AdPreparationCheck["status"]) {
  if (status === "valid" || status === "manually_approved") return "green";
  if (status === "warning" || status === "pending") return "amber";
  return "red";
}

function checkStatusLabel(status: AdPreparationCheck["status"]) {
  const labels: Record<AdPreparationCheck["status"], string> = {
    missing: "Faltando",
    pending: "Pendente",
    valid: "Ok",
    warning: "Atencao",
    blocked: "Bloqueado",
    manually_approved: "Aprovado manualmente"
  };
  return labels[status] || status;
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    photos: "Fotos",
    fipeAndPrice: "FIPE e preco",
    margin: "Margem",
    description: "Descricao",
    preparation: "Preparacao",
    documentation: "Documentacao"
  };
  return labels[category] || category;
}

function taskStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    doing: "Em andamento",
    done: "Concluida",
    cancelled: "Cancelada"
  };
  return labels[status] || status;
}

function checklistLabel(key: keyof VehicleIntelligence["checklist"]) {
  const labels: Record<keyof VehicleIntelligence["checklist"], string> = {
    has_main_photo: "Foto principal",
    has_minimum_photos: "6+ fotos",
    has_version: "Versao",
    has_mileage: "KM",
    has_color: "Cor",
    has_transmission: "Cambio",
    has_fuel: "Combustivel",
    has_fipe_reference: "FIPE",
    has_healthy_margin: "Margem saudavel",
    is_not_aging: "Giro em dia"
  };
  return labels[key];
}

function indexStockInsights(items: StockVehicle[]) {
  return items.reduce<Record<number, StockVehicle["intelligence"]>>((acc, item) => {
    acc[item.id] = item.intelligence;
    return acc;
  }, {});
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
  const [manualCatalogMode, setManualCatalogMode] = useState(false);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Array<{ name: string; size: number; url: string }>>([]);
  const [stockInsights, setStockInsights] = useState<Record<number, StockVehicle["intelligence"]>>({});
  const [vehicleDetail, setVehicleDetail] = useState<VehicleIntelligenceDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [preparationTaskForm, setPreparationTaskForm] = useState<PreparationTaskForm>(initialPreparationTaskForm);
  const [taskDrafts, setTaskDrafts] = useState<Record<number, PreparationTaskForm>>({});
  const [savingTaskId, setSavingTaskId] = useState<number | "new" | null>(null);
  const [preparedAds, setPreparedAds] = useState<PreparedAd[]>([]);
  const [adPlatform, setAdPlatform] = useState("instagram");
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [adPreparation, setAdPreparation] = useState<AdPreparationScore | null>(null);
  const [adSuggestions, setAdSuggestions] = useState<AdPreparationSuggestion[]>([]);
  const [isPreparationLoading, setIsPreparationLoading] = useState(false);
  const [preparationAction, setPreparationAction] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([listVeiculos(), listStockIntelligence()])
      .then(([vehiclesResult, stockResult]) => {
        if (vehiclesResult.status === "fulfilled") {
          setVeiculos(vehiclesResult.value);
        } else {
          throw vehiclesResult.reason;
        }

        if (stockResult.status === "fulfilled") {
          setStockInsights(indexStockInsights(stockResult.value));
        }
      })
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

  useEffect(() => {
    if (!isModalOpen || !editingVehicleId || manualCatalogMode || !form.fipe_brand_code) return;

    let cancelled = false;
    async function loadSavedFipeOptions() {
      try {
        const response = await listFipeModels(form.fipe_brand_code);
        if (cancelled) return;
        setFipeModels(response.models);

        if (form.fipe_model_code) {
          const years = await listFipeYears(form.fipe_brand_code, form.fipe_model_code);
          if (!cancelled) setFipeYears(years);
        }
      } catch {
        if (!cancelled) setManualCatalogMode(true);
      }
    }

    loadSavedFipeOptions();
    return () => {
      cancelled = true;
    };
  }, [editingVehicleId, form.fipe_brand_code, form.fipe_model_code, isModalOpen, manualCatalogMode]);

  const brandOptions = useMemo(() => getCatalogBrands(veiculos.map((veiculo) => veiculo.brand)), [veiculos]);
  const modelOptions = useMemo(
    () => getCatalogModels(form.brand, veiculos.filter((veiculo) => veiculo.brand === form.brand).map((veiculo) => veiculo.model)),
    [form.brand, veiculos]
  );
  const yearOptions = useMemo(() => getYearOptions(), []);
  const useFipeCatalog = fipeBrands.length > 0 && !manualCatalogMode;
  const currentImageUrls = imageUrlsFromText(form.image_urls);
  const activeIntelligence =
    vehicleDetail?.intelligence ||
    (editingVehicleId ? stockInsights[editingVehicleId] : null);
  const groupedPreparationChecks = useMemo(() => {
    return (adPreparation?.checks || []).reduce<Record<string, AdPreparationCheck[]>>((acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    }, {});
  }, [adPreparation]);

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
    resetSelectedImages();
    setVehicleDetail(null);
    setPreparationTaskForm(initialPreparationTaskForm);
    setTaskDrafts({});
    setPreparedAds([]);
    setAdPreparation(null);
    setAdSuggestions([]);
    setAdPlatform("instagram");
    setPublishNotice(null);
    setManualCatalogMode(false);
    setIsModalOpen(true);
  }

  function openEditModal(veiculo: Veiculo) {
    setEditingVehicleId(veiculo.id);
    setForm(formFromVehicle(veiculo));
    setFormError(null);
    resetSelectedImages();
    setManualCatalogMode(!veiculo.fipe_brand_code);
    setIsModalOpen(true);
    loadVehicleDetail(veiculo.id);
    loadVehicleAds(veiculo.id);
    loadAdPreparation(veiculo.id);
  }

  function resetVehicleModal() {
    setIsModalOpen(false);
    setEditingVehicleId(null);
    setForm(initialForm);
    setFormError(null);
    setVehicleDetail(null);
    setPreparationTaskForm(initialPreparationTaskForm);
    setTaskDrafts({});
    setPreparedAds([]);
    setAdPreparation(null);
    setAdSuggestions([]);
    setPublishNotice(null);
    setAdPlatform("instagram");
    resetSelectedImages();
    setManualCatalogMode(false);
  }

  async function refreshStockInsights() {
    const stock = await listStockIntelligence();
    setStockInsights(indexStockInsights(stock));
  }

  async function loadVehicleDetail(vehicleId: number) {
    setIsDetailLoading(true);
    try {
      const detail = await getVehicleIntelligence(vehicleId);
      setVehicleDetail(detail);
      setTaskDrafts(
        detail.preparation_tasks.reduce<Record<number, PreparationTaskForm>>((acc, task) => {
          acc[task.id] = {
            title: task.title || "",
            status: task.status || "pending",
            estimated_cost: task.estimated_cost == null ? "" : String(task.estimated_cost),
            actual_cost: task.actual_cost == null ? "" : String(task.actual_cost),
            supplier: task.supplier || ""
          };
          return acc;
        }, {})
      );
      setStockInsights((current) => ({
        ...current,
        [vehicleId]: detail.intelligence
      }));
      setForm((current) => ({
        ...current,
        preparation_cost_estimate: detail.vehicle.preparation_cost_estimate == null ? current.preparation_cost_estimate : String(detail.vehicle.preparation_cost_estimate),
        preparation_cost_actual: detail.vehicle.preparation_cost_actual == null ? current.preparation_cost_actual : String(detail.vehicle.preparation_cost_actual),
        preparation_status: detail.vehicle.preparation_status || current.preparation_status,
        ad_quality_score: String(detail.intelligence.ad_quality_score || current.ad_quality_score)
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel carregar a inteligencia do veiculo.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function loadVehicleAds(vehicleId: number) {
    try {
      const ads = await listVehicleAds(vehicleId);
      setPreparedAds(ads);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel carregar anuncios preparados.");
    }
  }

  async function loadAdPreparation(vehicleId: number) {
    setIsPreparationLoading(true);
    setPublishNotice(null);
    try {
      const preparation = await getVehiclePreparation(vehicleId);
      setAdPreparation(preparation);
      setAdSuggestions(preparation.suggestions || []);
      setForm((current) => ({
        ...current,
        ad_quality_score: String(preparation.score || current.ad_quality_score),
        ad_status: preparation.canPublish ? "ready_to_publish" : current.ad_status
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel carregar a preparacao do anuncio.");
    } finally {
      setIsPreparationLoading(false);
    }
  }

  async function recalculateAdPreparation() {
    if (!editingVehicleId) return;

    setPreparationAction("recalculate");
    setPublishNotice(null);
    setFormError(null);
    try {
      const preparation = await recalculateVehiclePreparation(editingVehicleId);
      setAdPreparation(preparation);
      setAdSuggestions(preparation.suggestions || adSuggestions);
      setForm((current) => ({
        ...current,
        ad_quality_score: String(preparation.score || 0),
        ad_status: preparation.canPublish ? "ready_to_publish" : "blocked_incomplete"
      }));
      const refreshed = await listVeiculos();
      setVeiculos(refreshed);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel recalcular o checklist.");
    } finally {
      setPreparationAction(null);
    }
  }

  async function createAdSuggestion(type: "description" | "price" | "priority") {
    if (!editingVehicleId) return;

    setPreparationAction(type);
    setPublishNotice(null);
    setFormError(null);
    try {
      const suggestion =
        type === "description"
          ? await suggestVehicleDescription(editingVehicleId)
          : type === "price"
            ? await suggestVehiclePrice(editingVehicleId)
            : await suggestVehiclePriority(editingVehicleId);
      setAdSuggestions((current) => [suggestion, ...current.filter((item) => item.id !== suggestion.id)]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel gerar a sugestao.");
    } finally {
      setPreparationAction(null);
    }
  }

  async function publishPreparedVehicle() {
    if (!editingVehicleId || !adPreparation?.canPublish) return;

    setPreparationAction("publish");
    setPublishNotice(null);
    setFormError(null);
    try {
      const result = await publishVehicle(editingVehicleId);
      setAdPreparation(result.preparation);
      setPublishNotice("Veiculo publicado com checklist aprovado pelo backend.");
      setForm((current) => ({
        ...current,
        ad_status: result.vehicle.ad_status || "published",
        status: result.vehicle.status || current.status,
        ad_quality_score: String(result.preparation.score || current.ad_quality_score)
      }));
      const refreshed = await listVeiculos();
      setVeiculos(refreshed);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel publicar o veiculo.");
    } finally {
      setPreparationAction(null);
    }
  }

  function closeModal() {
    if (isSaving) return;
    resetVehicleModal();
  }

  function resetSelectedImages() {
    setSelectedImageFiles([]);
    setImagePreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));
      return [];
    });
  }

  function handleImageSelection(files: FileList | null) {
    const images = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    setSelectedImageFiles(images);
    setImagePreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));
      return images.map((file) => ({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file)
      }));
    });
  }

  function removeSelectedImage(index: number) {
    setSelectedImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setImagePreviews((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function uploadSelectedImages(vehicleId: number) {
    for (const file of selectedImageFiles) {
      await uploadVehicleImage(vehicleId, file);
    }
  }

  async function savePreparationTask(payload: {
    id?: number;
    title?: string;
    status?: VehiclePreparationTask["status"];
    estimated_cost?: string | number | null;
    actual_cost?: string | number | null;
    supplier?: string | null;
  }) {
    if (!editingVehicleId) {
      setFormError("Salve o veiculo antes de adicionar etapas de preparacao.");
      return;
    }

    const title = payload.title?.trim();
    if (!payload.id && !title) {
      setFormError("Informe o nome da etapa de preparacao.");
      return;
    }

    setSavingTaskId(payload.id || "new");
    setFormError(null);
    try {
      await upsertVehiclePreparationTask(editingVehicleId, {
        id: payload.id,
        title,
        status: payload.status,
        estimated_cost: typeof payload.estimated_cost === "string" ? toNumberOrNull(payload.estimated_cost) : payload.estimated_cost ?? null,
        actual_cost: typeof payload.actual_cost === "string" ? toNumberOrNull(payload.actual_cost) : payload.actual_cost ?? null,
        supplier: payload.supplier?.trim() || null
      });
      setPreparationTaskForm(initialPreparationTaskForm);
      await loadVehicleDetail(editingVehicleId);
      const refreshed = await listVeiculos();
      setVeiculos(refreshed);
      await refreshStockInsights();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel salvar a etapa de preparacao.");
    } finally {
      setSavingTaskId(null);
    }
  }

  function updateTaskDraft(taskId: number, field: keyof PreparationTaskForm, value: string) {
    setTaskDrafts((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || initialPreparationTaskForm),
        [field]: value
      }
    }));
  }

  async function generatePreparedAd() {
    if (!editingVehicleId) {
      setFormError("Salve o veiculo antes de preparar anuncios.");
      return;
    }

    setIsGeneratingAd(true);
    setFormError(null);
    try {
      const ad = await generateVehicleAd(editingVehicleId, adPlatform);
      setPreparedAds((current) => [ad, ...current]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel preparar o anuncio.");
    } finally {
      setIsGeneratingAd(false);
    }
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
      documentation_cost: toNumberOrNull(form.documentation_cost),
      transport_cost: toNumberOrNull(form.transport_cost),
      commission_cost: toNumberOrNull(form.commission_cost),
      other_costs: toNumberOrNull(form.other_costs),
      price_strategy: form.price_strategy.trim() || null,
      ad_description: form.ad_description.trim() || null,
      repair_notes: form.repair_notes.trim() || null,
      notes: form.notes.trim() || null,
      preparation_items: parsePreparationItems(form.preparation_items),
      image_urls: imageUrlsFromText(form.image_urls),
      status: form.status,
      documentation_status: form.documentation_status,
      documentation_notes: form.documentation_notes.trim() || null,
      legal_restriction_status: form.legal_restriction_status,
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
      let saved: Veiculo;
      if (editingVehicleId) {
        saved = await updateVeiculo(editingVehicleId, buildPayload());
      } else {
        saved = await createVeiculo(buildPayload());
      }
      if (selectedImageFiles.length > 0) {
        await uploadSelectedImages(saved.id);
      }
      const refreshed = await listVeiculos();
      setVeiculos(refreshed);
      await refreshStockInsights();
      resetVehicleModal();
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
                    <Th>Score</Th>
                    <Th>Fotos</Th>
                    <Th>Acao sugerida</Th>
                    <Th>Status</Th>
                    <Th>Acoes</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((veiculo) => {
                    const margin = getExpectedMargin(veiculo);
                    const insight = stockInsights[veiculo.id];
                    const score = insight?.ad_quality_score ?? veiculo.ad_quality_score ?? 0;
                    const topSuggestion = insight?.suggestions?.[0];
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
                        <Td><Badge tone={scoreTone(score)}>{score}/100</Badge></Td>
                        <Td>{veiculo.images?.length || 0}</Td>
                        <Td>
                          <span className="line-clamp-2 text-xs text-slate-600">
                            {topSuggestion?.action || "Sem alerta critico"}
                          </span>
                        </Td>
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
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-950">Identificacao e catalogo</h3>
              {fipeBrands.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setManualCatalogMode((current) => !current)}>
                  {manualCatalogMode ? "Usar FIPE" : "Preencher manualmente"}
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {useFipeCatalog ? (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-2 block">Marca</span>
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.fipe_brand_code} onChange={(event) => selectFipeBrand(event.target.value)}>
                      <option value="">Selecionar marca</option>
                      {fipeBrands.map((brand) => <option key={brand.code} value={brand.code}>{brand.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-2 block">Modelo</span>
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.fipe_model_code} onChange={(event) => selectFipeModel(event.target.value)} disabled={!form.fipe_brand_code || isFipeLoading}>
                      <option value="">Selecionar modelo</option>
                      {fipeModels.map((model) => <option key={model.code} value={model.code}>{model.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-2 block">Ano/modelo</span>
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.fipe_year_code} onChange={(event) => selectFipeYear(event.target.value)} disabled={!form.fipe_model_code || isFipeLoading}>
                      <option value="">Selecionar ano</option>
                      {fipeYears.map((year) => <option key={year.code} value={year.code}>{year.name}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <Input label="Marca" list="vehicle-brand-options" value={form.brand} onChange={(event) => updateField("brand", event.target.value)} required />
                  <Input label="Modelo" list="vehicle-model-options" value={form.model} onChange={(event) => updateField("model", event.target.value)} required />
                  <Input label="Ano/modelo" list="vehicle-year-options" value={form.year} onChange={(event) => updateField("year", event.target.value)} required />
                </>
              )}
              <Input label="Valor FIPE" inputMode="decimal" value={form.fipe_price} onChange={(event) => updateField("fipe_price", event.target.value)} placeholder="Carregado pela FIPE ou manual" />
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
              <Input label="Custo documental" inputMode="decimal" value={form.documentation_cost} onChange={(event) => updateField("documentation_cost", event.target.value)} />
              <Input label="Transporte" inputMode="decimal" value={form.transport_cost} onChange={(event) => updateField("transport_cost", event.target.value)} />
              <Input label="Comissao prevista" inputMode="decimal" value={form.commission_cost} onChange={(event) => updateField("commission_cost", event.target.value)} />
              <Input label="Outros custos" inputMode="decimal" value={form.other_costs} onChange={(event) => updateField("other_costs", event.target.value)} />
              <Input label="Estrategia de preco" value={form.price_strategy} onChange={(event) => updateField("price_strategy", event.target.value)} placeholder="competitive, fast_sale, premium..." />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Painel inteligente do veiculo</h3>
                <p className="mt-1 text-xs text-slate-500">Preparacao, qualidade do anuncio, margem, FIPE e acao recomendada.</p>
              </div>
              {activeIntelligence ? (
                <Badge tone={scoreTone(activeIntelligence.ad_quality_score)}>
                  Score {activeIntelligence.ad_quality_score}/100
                </Badge>
              ) : (
                <Badge variant="neutral">{isDetailLoading ? "Carregando..." : "Salve para calcular"}</Badge>
              )}
            </div>

            {activeIntelligence ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-slate-500">Custo total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrency(activeIntelligence.total_cost)}</p>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-slate-500">Margem prevista</p>
                    <p className={numberValue(activeIntelligence.margin) >= 0 ? "mt-1 text-sm font-semibold text-emerald-700" : "mt-1 text-sm font-semibold text-red-700"}>
                      {formatCurrency(activeIntelligence.margin)}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-slate-500">Dif. FIPE</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {activeIntelligence.fipe_difference_percent == null ? "-" : `${activeIntelligence.fipe_difference_percent}%`}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-slate-500">Dias em estoque</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{activeIntelligence.days_in_stock}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {(Object.keys(activeIntelligence.checklist) as Array<keyof VehicleIntelligence["checklist"]>).map((key) => (
                    <div key={key} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-700">
                      {activeIntelligence.checklist[key] ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                      {checklistLabel(key)}
                    </div>
                  ))}
                </div>

                <div className="rounded-md bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Acao recomendada</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {activeIntelligence.suggestions[0]?.action || "Nenhuma acao critica agora."}
                  </p>
                  {activeIntelligence.suggestions[0]?.reason ? (
                    <p className="mt-1 text-xs text-slate-500">{activeIntelligence.suggestions[0].reason}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {editingVehicleId ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="mb-3 flex flex-col gap-1">
                  <h4 className="text-sm font-semibold text-slate-950">Etapas de preparacao e manutencao</h4>
                  <p className="text-xs text-slate-500">Cada etapa soma custo estimado/realizado ao veiculo e atualiza margem automaticamente.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  <Input label="Etapa" value={preparationTaskForm.title} onChange={(event) => setPreparationTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Pneus, funilaria..." />
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-2 block">Status</span>
                    <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={preparationTaskForm.status} onChange={(event) => setPreparationTaskForm((current) => ({ ...current, status: event.target.value as VehiclePreparationTask["status"] }))}>
                      <option value="pending">Pendente</option>
                      <option value="doing">Em andamento</option>
                      <option value="done">Concluida</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </label>
                  <Input label="Estimado" inputMode="decimal" value={preparationTaskForm.estimated_cost} onChange={(event) => setPreparationTaskForm((current) => ({ ...current, estimated_cost: event.target.value }))} />
                  <Input label="Realizado" inputMode="decimal" value={preparationTaskForm.actual_cost} onChange={(event) => setPreparationTaskForm((current) => ({ ...current, actual_cost: event.target.value }))} />
                  <div className="flex items-end">
                    <Button type="button" className="w-full" disabled={savingTaskId === "new"} onClick={() => savePreparationTask(preparationTaskForm)}>
                      {savingTaskId === "new" ? "Salvando..." : "Adicionar etapa"}
                    </Button>
                  </div>
                </div>

                {vehicleDetail?.preparation_tasks.length ? (
                  <div className="mt-4 space-y-3">
                    {vehicleDetail.preparation_tasks.map((task) => {
                      const draft = taskDrafts[task.id] || {
                        title: task.title,
                        status: task.status,
                        estimated_cost: task.estimated_cost == null ? "" : String(task.estimated_cost),
                        actual_cost: task.actual_cost == null ? "" : String(task.actual_cost),
                        supplier: task.supplier || ""
                      };
                      return (
                        <div key={task.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-6">
                          <Input label="Etapa" value={draft.title} onChange={(event) => updateTaskDraft(task.id, "title", event.target.value)} />
                          <label className="block text-sm font-medium text-slate-700">
                            <span className="mb-2 block">Status</span>
                            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={draft.status} onChange={(event) => updateTaskDraft(task.id, "status", event.target.value)}>
                              <option value="pending">Pendente</option>
                              <option value="doing">Em andamento</option>
                              <option value="done">Concluida</option>
                              <option value="cancelled">Cancelada</option>
                            </select>
                          </label>
                          <Input label="Estimado" inputMode="decimal" value={draft.estimated_cost} onChange={(event) => updateTaskDraft(task.id, "estimated_cost", event.target.value)} />
                          <Input label="Realizado" inputMode="decimal" value={draft.actual_cost} onChange={(event) => updateTaskDraft(task.id, "actual_cost", event.target.value)} />
                          <Input label="Fornecedor" value={draft.supplier} onChange={(event) => updateTaskDraft(task.id, "supplier", event.target.value)} />
                          <div className="flex items-end">
                            <Button type="button" variant="secondary" className="w-full" disabled={savingTaskId === task.id} onClick={() => savePreparationTask({ id: task.id, ...draft })}>
                              {savingTaskId === task.id ? "Salvando..." : taskStatusLabel(draft.status)}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">Nenhuma etapa de preparacao cadastrada para este veiculo.</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Salve o veiculo uma vez para liberar o painel de etapas de preparacao.</p>
            )}
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
              <span className="mb-2 flex items-center gap-2"><Camera className="h-4 w-4" /> Fotos do veiculo</span>
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Enviar imagens do computador</p>
                    <p className="mt-1 text-xs text-slate-500">JPEG, PNG ou WebP. As fotos sao enviadas depois que o veiculo e salvo.</p>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800">
                    <ImagePlus className="h-4 w-4" />
                    Escolher fotos
                    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => handleImageSelection(event.target.files)} />
                  </label>
                </div>
                {imagePreviews.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={`${preview.name}-${preview.url}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                        <img src={preview.url} alt={preview.name} className="h-28 w-full object-cover" />
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-800">{preview.name}</p>
                            <p className="text-xs text-slate-500">{Math.max(1, Math.round(preview.size / 1024))} KB</p>
                          </div>
                          <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600" onClick={() => removeSelectedImage(index)} aria-label={`Remover ${preview.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {editingVehicleId && currentImageUrls.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-slate-600">Fotos ja cadastradas</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {currentImageUrls.map((url) => (
                        <img key={url} src={url} alt="Foto cadastrada do veiculo" className="h-24 w-full rounded-md border border-slate-200 object-cover" />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 block">Observacoes internas</span>
              <textarea className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Historico, documentacao, restricoes ou pontos de atencao." />
            </label>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Descricao comercial do anuncio</span>
              <textarea className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.ad_description} onChange={(event) => updateField("ad_description", event.target.value)} placeholder="Descricao segura com dados reais do veiculo, diferenciais e chamada para contato." />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Documentacao</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.documentation_status} onChange={(event) => updateField("documentation_status", event.target.value)}>
                <option value="pending">Pendente</option>
                <option value="checked">Conferida</option>
                <option value="ready">Pronta para venda</option>
                <option value="blocked">Bloqueada</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Restricao legal</span>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.legal_restriction_status} onChange={(event) => updateField("legal_restriction_status", event.target.value)}>
                <option value="clear">Sem restricao critica</option>
                <option value="unknown">Nao conferida</option>
                <option value="restriction">Com restricao</option>
                <option value="blocked">Bloqueio critico</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 block">Notas de documentacao</span>
              <textarea className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={form.documentation_notes} onChange={(event) => updateField("documentation_notes", event.target.value)} placeholder="Debitos, multas, transferencia, alienacao ou pontos de conferencia." />
            </label>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Preparacao de anuncios</h3>
                <p className="mt-1 text-xs text-slate-500">Gere titulo, descricao, legenda, checklist e campos para Instagram ou portais.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" value={adPlatform} onChange={(event) => setAdPlatform(event.target.value)}>
                  <option value="instagram">Instagram feed</option>
                  <option value="instagram_story">Instagram stories</option>
                  <option value="portal">Portal de anuncios</option>
                  <option value="carros_na_cidade">Carros na Cidade</option>
                </select>
                <Button type="button" disabled={!editingVehicleId || isGeneratingAd} onClick={generatePreparedAd}>
                  {isGeneratingAd ? "Preparando..." : "Preparar anuncio"}
                </Button>
              </div>
            </div>

            {editingVehicleId ? (
              <div className="mb-5 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={scoreTone(adPreparation?.score || 0)}>
                        Score {adPreparation?.score ?? 0}/100
                      </Badge>
                      <Badge tone={publishTone(adPreparation?.canPublish)}>
                        {adPreparation?.canPublish ? "Pronto para publicar" : "Publicacao bloqueada"}
                      </Badge>
                      <Badge variant="neutral">
                        {isPreparationLoading ? "Carregando..." : preparationStatusLabel(adPreparation?.grade)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      O botao Publicar usa a validacao do backend. Quando houver bloqueios, o envio fica travado ate as pendencias serem corrigidas.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="secondary" disabled={Boolean(preparationAction)} onClick={recalculateAdPreparation}>
                      <RefreshCw className="h-4 w-4" />
                      {preparationAction === "recalculate" ? "Recalculando..." : "Recalcular"}
                    </Button>
                    <Button type="button" disabled={!adPreparation?.canPublish || preparationAction === "publish"} onClick={publishPreparedVehicle}>
                      <Send className="h-4 w-4" />
                      {preparationAction === "publish" ? "Publicando..." : "Publicar"}
                    </Button>
                  </div>
                </div>

                {publishNotice ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{publishNotice}</p> : null}

                {adPreparation?.blockingReasons.length ? (
                  <div className="rounded-md border border-red-100 bg-white p-3">
                    <p className="text-xs font-semibold text-red-700">Bloqueios para publicacao</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {adPreparation.blockingReasons.map((item) => (
                        <div key={item.key} className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                          <p className="font-medium">{categoryLabel(item.category)}</p>
                          <p>{item.message}</p>
                          {item.actionHint ? <p className="mt-1 text-red-700">{item.actionHint}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {adPreparation?.warnings.length ? (
                  <div className="rounded-md border border-amber-100 bg-white p-3">
                    <p className="text-xs font-semibold text-amber-700">Alertas</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {adPreparation.warnings.slice(0, 6).map((item) => (
                        <div key={item.key} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          <p className="font-medium">{categoryLabel(item.category)}</p>
                          <p>{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {Object.keys(groupedPreparationChecks).length ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {Object.entries(groupedPreparationChecks).map(([category, checks]) => (
                      <div key={category} className="rounded-md bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700">{categoryLabel(category)}</p>
                          <span className="text-xs text-slate-500">{adPreparation?.breakdown?.[category] ?? 0} pts</span>
                        </div>
                        <div className="space-y-2">
                          {checks.map((check) => (
                            <div key={check.key} className="flex items-start gap-2 rounded-md border border-slate-100 px-2 py-2">
                              {check.status === "valid" || check.status === "manually_approved" ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-medium text-slate-800">{check.message || check.key}</p>
                                  <Badge tone={checkStatusTone(check.status)}>{checkStatusLabel(check.status)}</Badge>
                                </div>
                                {check.actionHint ? <p className="mt-1 text-xs text-slate-500">{check.actionHint}</p> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Clique em Recalcular para gerar o checklist completo deste veiculo.</p>
                )}

                <div className="rounded-md bg-white p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Sugestoes automaticas</p>
                      <p className="mt-1 text-xs text-slate-500">Geradas pelo backend com regras seguras, sem chamar IA direto no navegador.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" size="sm" variant="secondary" disabled={Boolean(preparationAction)} onClick={() => createAdSuggestion("description")}>
                        <Sparkles className="h-3.5 w-3.5" />
                        {preparationAction === "description" ? "Gerando..." : "Gerar descricao"}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={Boolean(preparationAction)} onClick={() => createAdSuggestion("price")}>
                        {preparationAction === "price" ? "Calculando..." : "Sugerir preco"}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={Boolean(preparationAction)} onClick={() => createAdSuggestion("priority")}>
                        {preparationAction === "priority" ? "Priorizando..." : "Sugerir prioridade"}
                      </Button>
                    </div>
                  </div>

                  {adSuggestions.length ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {adSuggestions.slice(0, 6).map((suggestion) => (
                        <div key={suggestion.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-700">{suggestion.suggestion_type || "sugestao"}</p>
                            <Badge variant="neutral">{suggestion.provider || "rule_based"}</Badge>
                          </div>
                          {suggestion.payload.suggestedTitle ? <p className="mt-2 text-sm font-medium text-slate-950">{suggestion.payload.suggestedTitle}</p> : null}
                          {suggestion.payload.suggestedDescription ? <p className="mt-2 line-clamp-6 text-xs text-slate-600">{suggestion.payload.suggestedDescription}</p> : null}
                          {suggestion.payload.suggestedPrice ? <p className="mt-2 text-sm font-semibold text-slate-950">{formatCurrency(suggestion.payload.suggestedPrice)}</p> : null}
                          {suggestion.payload.priority ? <p className="mt-2 text-sm font-semibold text-slate-950">{suggestion.payload.priority}</p> : null}
                          {suggestion.payload.reason ? <p className="mt-2 text-xs text-slate-600">{suggestion.payload.reason}</p> : null}
                          {suggestion.payload.reasons?.length ? <p className="mt-2 text-xs text-slate-500">{suggestion.payload.reasons.join(" ")}</p> : null}
                          {suggestion.payload.warnings?.length ? <p className="mt-2 text-xs text-amber-700">{suggestion.payload.warnings.join(" ")}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">Nenhuma sugestao gerada ainda.</p>
                  )}
                </div>
              </div>
            ) : null}

            {!editingVehicleId ? (
              <p className="text-xs text-slate-500">Salve o veiculo uma vez para preparar anuncios.</p>
            ) : preparedAds.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum anuncio preparado ainda.</p>
            ) : (
              <div className="space-y-3">
                {preparedAds.slice(0, 3).map((ad) => (
                  <div key={ad.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{ad.title || "Anuncio sem titulo"}</p>
                        <p className="text-xs text-slate-500">{ad.metadata?.platform_name || ad.platform || "Canal"} · {ad.status || "draft"}</p>
                      </div>
                      <Badge variant={ad.status === "ready" ? "success" : "warning"}>
                        {ad.status === "ready" ? "Pronto" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{ad.description}</p>
                    {ad.metadata?.caption ? (
                      <div className="mt-3 rounded-md bg-white p-3">
                        <p className="text-xs font-medium text-slate-500">Legenda sugerida</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{ad.metadata.caption}</p>
                        {ad.metadata.hashtags?.length ? (
                          <p className="mt-2 text-xs text-slate-500">{ad.metadata.hashtags.join(" ")}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {ad.metadata?.checklist?.length ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ad.metadata.checklist.map((item) => (
                          <div key={item.key} className="flex items-center gap-2 text-xs text-slate-600">
                            {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                            {item.label}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
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
                <option value="blocked_incomplete">Bloqueado/incompleto</option>
                <option value="ready_to_publish">Pronto para publicar</option>
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
