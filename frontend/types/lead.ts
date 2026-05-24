export type Lead = {
  id: number;
  name?: string | null;
  client_name?: string | null;
  phone?: string | null;
  client_phone?: string | null;
  email?: string | null;
  source?: string | null;
  origin?: string | null;
  status?: string | null;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  next_action_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
