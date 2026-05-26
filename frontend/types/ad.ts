export type PreparedAd = {
  id: number;
  vehicle_id: number;
  title?: string | null;
  description?: string | null;
  platform?: string | null;
  status?: "draft" | "ready" | "published" | string | null;
  metadata?: {
    caption?: string;
    hashtags?: string[];
    checklist?: Array<{ key: string; label: string; done: boolean }>;
    photo_plan?: {
      current_count: number;
      missing_minimum: number;
      recommended: string[];
    };
    platform_name?: string;
    portal_fields?: Record<string, unknown>;
    intelligence?: Record<string, unknown>;
    images?: string[];
  } | null;
  created_at?: string;
  updated_at?: string;
};
