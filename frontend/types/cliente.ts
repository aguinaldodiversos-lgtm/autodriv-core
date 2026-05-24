export type Cliente = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  notes?: string | null;
  birth_date?: string | null;
  preferred_contact_channel?: string | null;
  tags?: string[];
  created_at?: string;
};
