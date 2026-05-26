import type { Veiculo } from "./veiculo";

export type VehiclePreparationTask = {
  id: number;
  vehicle_id: number;
  title: string;
  status: "pending" | "doing" | "done" | "cancelled";
  estimated_cost?: number | string | null;
  actual_cost?: number | string | null;
  supplier?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
};

export type VehicleSuggestion = {
  type: string;
  priority: number;
  action: string;
  reason: string;
};

export type VehicleChecklist = {
  has_main_photo: boolean;
  has_minimum_photos: boolean;
  has_version: boolean;
  has_mileage: boolean;
  has_color: boolean;
  has_transmission: boolean;
  has_fuel: boolean;
  has_fipe_reference: boolean;
  has_healthy_margin: boolean;
  is_not_aging: boolean;
};

export type VehicleIntelligence = {
  total_cost?: number | string | null;
  projected_cost?: number | string | null;
  margin?: number | string | null;
  projected_margin?: number | string | null;
  margin_percent?: number | null;
  fipe_difference_percent?: number | null;
  days_in_stock: number;
  ad_quality_score: number;
  image_count: number;
  has_main_image: boolean;
  preparation_tasks_total: number;
  pending_preparation_tasks: number;
  checklist: VehicleChecklist;
  suggestions: VehicleSuggestion[];
};

export type StockVehicle = Veiculo & {
  intelligence: VehicleIntelligence;
};

export type VehicleIntelligenceDetail = {
  vehicle: Veiculo;
  intelligence: VehicleIntelligence;
  preparation_tasks: VehiclePreparationTask[];
  appraisals: unknown[];
};

export type UpsertPreparationTaskPayload = {
  id?: number;
  title?: string;
  status?: VehiclePreparationTask["status"];
  estimated_cost?: number | null;
  actual_cost?: number | null;
  supplier?: string | null;
  due_at?: string | null;
};
