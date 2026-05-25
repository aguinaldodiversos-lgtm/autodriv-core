export type FipeBrand = {
  code: string;
  name: string;
};

export type FipeModel = {
  code: string;
  name: string;
};

export type FipeYear = {
  code: string;
  name: string;
};

export type FipeModelsResponse = {
  models: FipeModel[];
  years: FipeYear[];
};

export type FipeValue = {
  brand?: string | null;
  model?: string | null;
  year_model?: number | null;
  fuel?: string | null;
  fipe_code?: string | null;
  reference_month?: string | null;
  raw_value?: string | null;
  value?: number | null;
  authentication?: string | null;
};
