export type Contrato = {
  id: number;
  sale_id?: number | null;
  client_name?: string | null;
  client_phone?: string | null;
  responsible_name?: string | null;
  status?: string | null;
  price?: number | string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  vehicle_title?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  version?: number | null;
  created_at?: string;
  updated_at?: string | null;
};
