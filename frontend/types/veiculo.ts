export type Veiculo = {
  id: number;
  title: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  price?: number | string | null;
  fipe_price?: number | string | null;
  status?: string | null;
  documentation_status?: string | null;
  ad_status?: string | null;
  ad_quality_score?: number | null;
  preparation_status?: string | null;
  created_at?: string;
};
