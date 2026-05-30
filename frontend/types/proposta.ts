import type { Contrato } from "./contrato";

export type Proposta = {
  id: number;
  dealership_id?: number;
  client_id?: number | null;
  vehicle_id?: number | null;
  lead_id?: number | null;
  price?: number | string | null;
  status?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  accepted_at?: string | null;
  accepted_by?: number | null;
  sale_id?: number | null;
  contract_id?: number | null;
  client_name?: string | null;
  client_phone?: string | null;
  vehicle_title?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  created_by_name?: string | null;
  contract_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AcceptPropostaPayload = {
  price?: number | null;
  payment_method?: string | null;
  notes?: string | null;
};

export type AcceptPropostaResult = {
  proposal: Proposta;
  sale: {
    id: number;
    price?: number | string | null;
    approval_status?: string | null;
  };
  contract: Contrato;
};
