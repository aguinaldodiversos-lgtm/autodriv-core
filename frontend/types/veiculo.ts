export type Veiculo = {
  id: number;
  title: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  price?: number | string | null;
  fipe_price?: number | string | null;
  purchase_price?: number | string | null;
  acquisition_cost?: number | string | null;
  acquisition_source?: string | null;
  preparation_cost_estimate?: number | string | null;
  preparation_cost_actual?: number | string | null;
  ad_quality_score?: number | null;
  is_featured?: boolean | null;
  status?: string | null;
  documentation_status?: string | null;
  ad_status?: string | null;
  preparation_status?: string | null;
  created_at?: string;
};

export type CreateVeiculoPayload = {
  brand: string;
  model: string;
  year: number;
  price?: number | null;
  fipe_price?: number | null;
  status?: string;
  purchase_price?: number | null;
  acquisition_cost?: number | null;
  acquisition_source?: string | null;
  preparation_status?: string;
  preparation_cost_estimate?: number | null;
  preparation_cost_actual?: number | null;
  ad_status?: string;
  ad_quality_score?: number;
};
