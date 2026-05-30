export type VehicleImage = {
  id: number;
  image_url: string;
  is_main?: boolean | null;
  is_cover?: boolean | null;
  sort_order?: number | null;
  label?: string | null;
  notes?: string | null;
};

export type Veiculo = {
  id: number;
  title: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  fipe_brand_code?: string | null;
  fipe_model_code?: string | null;
  fipe_year_code?: string | null;
  fipe_code?: string | null;
  fipe_reference_month?: string | null;
  license_plate?: string | null;
  version?: string | null;
  color?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  mileage?: number | null;
  price?: number | string | null;
  fipe_price?: number | string | null;
  purchase_price?: number | string | null;
  acquisition_cost?: number | string | null;
  acquisition_source?: string | null;
  preparation_cost_estimate?: number | string | null;
  preparation_cost_actual?: number | string | null;
  documentation_cost?: number | string | null;
  transport_cost?: number | string | null;
  commission_cost?: number | string | null;
  other_costs?: number | string | null;
  price_strategy?: string | null;
  ad_description?: string | null;
  notes?: string | null;
  repair_notes?: string | null;
  preparation_items?: Array<{
    description?: string;
    estimated_cost?: number;
    actual_cost?: number;
    status?: string;
  }> | null;
  images?: VehicleImage[];
  ad_quality_score?: number | null;
  is_featured?: boolean | null;
  status?: string | null;
  documentation_status?: string | null;
  documentation_notes?: string | null;
  legal_restriction_status?: string | null;
  ad_status?: string | null;
  preparation_status?: string | null;
  created_at?: string;
};

export type CreateVeiculoPayload = {
  brand: string;
  model: string;
  year: number;
  fipe_brand_code?: string | null;
  fipe_model_code?: string | null;
  fipe_year_code?: string | null;
  fipe_code?: string | null;
  fipe_reference_month?: string | null;
  license_plate?: string | null;
  version?: string | null;
  color?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  mileage?: number | null;
  price?: number | null;
  fipe_price?: number | null;
  status?: string;
  purchase_price?: number | null;
  acquisition_cost?: number | null;
  acquisition_source?: string | null;
  preparation_status?: string;
  preparation_cost_estimate?: number | null;
  preparation_cost_actual?: number | null;
  documentation_cost?: number | null;
  transport_cost?: number | null;
  commission_cost?: number | null;
  other_costs?: number | null;
  price_strategy?: string | null;
  ad_description?: string | null;
  notes?: string | null;
  repair_notes?: string | null;
  preparation_items?: Array<{
    description: string;
    estimated_cost?: number | null;
    actual_cost?: number | null;
    status?: string;
  }>;
  image_urls?: string[];
  documentation_status?: string;
  documentation_notes?: string | null;
  legal_restriction_status?: string;
  ad_status?: string;
  ad_quality_score?: number;
};

export type VehicleOperationalView = "stock" | "showroom" | "preparation" | "sold-month";

export type VehicleOperationalPendingItem = {
  key: string;
  label: string;
  severity: "info" | "warning" | "blocking" | "critical" | string;
  category?: string | null;
};

export type VehicleOperationalRecommendation = {
  type: string;
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  message: string;
  recommendedActions?: string[];
};

export type VehicleOperationalItem = {
  id: number;
  dealershipId: number;
  brand?: string | null;
  model?: string | null;
  version?: string | null;
  year?: number | null;
  modelYear?: number | null;
  licensePlate?: string | null;
  mainPhotoUrl?: string | null;
  imageCount: number;
  status?: string | null;
  publicationStatus?: string | null;
  preparationStatus?: string | null;
  price?: number | null;
  fipeValue?: number | null;
  fipeDeltaAmount?: number | null;
  fipeDeltaPercent?: number | null;
  acquisitionPrice?: number | null;
  estimatedCosts?: number | null;
  expectedMarginAmount?: number | null;
  expectedMarginPercent?: number | null;
  realizedMarginAmount?: number | null;
  realizedMarginPercent?: number | null;
  adScore: number;
  adScoreGrade?: string | null;
  canPublish: boolean;
  daysInStock?: number | null;
  soldAt?: string | null;
  soldPrice?: number | null;
  soldBy?: string | null;
  saleStatus?: string | null;
  topPendingItems: VehicleOperationalPendingItem[];
  recommendation: VehicleOperationalRecommendation;
  actions: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type VehicleOperationalSummary = {
  view: VehicleOperationalView;
  total: number;
  stockCount: number;
  showroomCount: number;
  preparationCount: number;
  soldMonthCount: number;
  attentionCount: number;
  blockedCount: number;
  readyToPublishCount: number;
  averageScore: number;
  totalExpectedMargin: number;
  totalRealizedMarginMonth: number;
  totalSoldValueMonth?: number;
  averageDaysInStockSoldMonth?: number;
};

export type VehicleOperationalResponse = {
  data: VehicleOperationalItem[];
  summary: VehicleOperationalSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SellVehiclePayload = {
  sold_price: number;
  sold_at?: string | null;
  notes?: string | null;
};

export type SellVehicleResult = {
  vehicle: Veiculo & {
    sold_at?: string | null;
    sold_price?: number | string | null;
    sold_by_user_id?: number | null;
    sale_status?: string | null;
    sale_notes?: string | null;
  };
  sale: {
    id: number;
    vehicle_id?: number | null;
    price: number | string;
    approval_status?: string | null;
    approved_at?: string | null;
  };
};
