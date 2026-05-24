export type Contrato = {
  id: number;
  sale_id?: number | null;
  client_name?: string | null;
  responsible_name?: string | null;
  status?: string | null;
  price?: number | string | null;
  amount?: number | string | null;
  created_at?: string;
};
