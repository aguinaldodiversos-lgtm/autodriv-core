const DEFAULT_BASE_URL = "https://parallelum.com.br/fipe/api/v1";
const ALLOWED_TYPES = new Set(["carros", "motos", "caminhoes"]);

function normalizeType(type) {
  const normalized = String(type || "carros").trim();
  if (!ALLOWED_TYPES.has(normalized)) {
    const err = new Error("Tipo de veiculo FIPE invalido");
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function normalizeCode(value, field) {
  const code = String(value || "").trim();
  if (!code) {
    const err = new Error(`${field} obrigatorio`);
    err.statusCode = 400;
    throw err;
  }
  return encodeURIComponent(code);
}

async function request(path) {
  const baseUrl = (process.env.FIPE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const err = new Error("Nao foi possivel consultar a FIPE");
    err.statusCode = response.status >= 500 ? 502 : response.status;
    throw err;
  }

  return response.json();
}

function parseFipeCurrency(value) {
  if (typeof value !== "string") return null;
  const numeric = Number(
    value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
  return Number.isFinite(numeric) ? numeric : null;
}

async function listBrands(type) {
  const vehicleType = normalizeType(type);
  const rows = await request(`/${vehicleType}/marcas`);
  return rows.map((item) => ({
    code: String(item.codigo),
    name: item.nome
  }));
}

async function listModels(type, brandCode) {
  const vehicleType = normalizeType(type);
  const brand = normalizeCode(brandCode, "brandCode");
  const data = await request(`/${vehicleType}/marcas/${brand}/modelos`);
  return {
    models: (data.modelos || []).map((item) => ({
      code: String(item.codigo),
      name: item.nome
    })),
    years: (data.anos || []).map((item) => ({
      code: String(item.codigo),
      name: item.nome
    }))
  };
}

async function listYears(type, brandCode, modelCode) {
  const vehicleType = normalizeType(type);
  const brand = normalizeCode(brandCode, "brandCode");
  const model = normalizeCode(modelCode, "modelCode");
  const rows = await request(`/${vehicleType}/marcas/${brand}/modelos/${model}/anos`);
  return rows.map((item) => ({
    code: String(item.codigo),
    name: item.nome
  }));
}

async function getValue(type, brandCode, modelCode, yearCode) {
  const vehicleType = normalizeType(type);
  const brand = normalizeCode(brandCode, "brandCode");
  const model = normalizeCode(modelCode, "modelCode");
  const year = normalizeCode(yearCode, "yearCode");
  const data = await request(`/${vehicleType}/marcas/${brand}/modelos/${model}/anos/${year}`);

  return {
    brand: data.Marca || data.marca || null,
    model: data.Modelo || data.modelo || null,
    year_model: data.AnoModelo || data.anoModelo || null,
    fuel: data.Combustivel || data.combustivel || null,
    fipe_code: data.CodigoFipe || data.codigoFipe || null,
    reference_month: data.MesReferencia || data.mesReferencia || null,
    raw_value: data.Valor || data.valor || null,
    value: parseFipeCurrency(data.Valor || data.valor),
    authentication: data.Autenticacao || data.autenticacao || null
  };
}

module.exports = {
  listBrands,
  listModels,
  listYears,
  getValue
};
