const pool = require("../../config/db");
const repo = require("./ads.repository");
const { calculateVehicleSignals } = require("../stock_intelligence/stockIntelligence.service");

const platformLabels = {
  instagram: "Instagram",
  instagram_story: "Stories",
  portal: "Portal de anuncios",
  carros_na_cidade: "Carros na Cidade",
  generic: "Anuncio"
};

function formatCurrency(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(numeric);
}

function vehicleName(vehicle) {
  return vehicle.title ||
    [vehicle.brand, vehicle.model, vehicle.version, vehicle.year].filter(Boolean).join(" ");
}

function buildChecklist(vehicle, images, intelligence) {
  return [
    { key: "main_photo", label: "Foto principal definida", done: Boolean(intelligence.has_main_image) },
    { key: "minimum_photos", label: "Minimo de 6 fotos", done: images.length >= 6 },
    {
      key: "vehicle_data",
      label: "Versao, KM, cor, cambio e combustivel preenchidos",
      done: Boolean(vehicle.version && vehicle.mileage && vehicle.color && vehicle.transmission && vehicle.fuel)
    },
    { key: "fipe", label: "Referencia FIPE preenchida", done: Number(vehicle.fipe_price || 0) > 0 },
    {
      key: "margin",
      label: "Margem saudavel antes de publicar",
      done: intelligence.margin_percent == null || intelligence.margin_percent >= 8
    },
    { key: "preparation", label: "Preparacao concluida", done: vehicle.preparation_status === "done" }
  ];
}

function buildPhotoPlan(images) {
  const missing = Math.max(0, 6 - images.length);
  return {
    current_count: images.length,
    missing_minimum: missing,
    recommended:
      missing > 0
        ? [
            "frente em 45 graus",
            "traseira em 45 graus",
            "painel com KM visivel",
            "bancos dianteiros",
            "porta-malas",
            "motor"
          ].slice(0, missing)
        : []
  };
}

function buildAdCopy(vehicle, platform) {
  const name = vehicleName(vehicle);
  const price = formatCurrency(vehicle.price);
  const details = [
    vehicle.version,
    vehicle.mileage ? `${vehicle.mileage} km` : null,
    vehicle.fuel,
    vehicle.transmission,
    vehicle.color
  ].filter(Boolean);

  const title = `${name}${vehicle.version ? "" : " completo"}`.trim();
  const description = [
    `${name} disponivel para venda.`,
    details.length ? `Destaques: ${details.join(", ")}.` : null,
    price ? `Valor anunciado: ${price}.` : null,
    Number(vehicle.fipe_price || 0) > 0 ? "Referencia FIPE cadastrada para comparacao." : null,
    "Entre em contato para confirmar disponibilidade, condicoes e agendar uma visita."
  ].filter(Boolean).join("\n");

  const caption = [
    `${name} chegou ao estoque.`,
    details.length ? details.join(" | ") : null,
    price ? `Anunciado por ${price}` : null,
    "Chame no WhatsApp e agende sua visita."
  ].filter(Boolean).join("\n");

  return {
    title: platform === "instagram_story" ? name.slice(0, 55) : title.slice(0, 90),
    description,
    caption,
    platform_name: platformLabels[platform] || platformLabels.generic,
    hashtags: [
      "#carrosusados",
      "#seminovos",
      vehicle.brand ? `#${String(vehicle.brand).replace(/\s+/g, "")}` : null,
      vehicle.model ? `#${String(vehicle.model).replace(/\s+/g, "")}` : null,
      "#autodriv"
    ].filter(Boolean)
  };
}

async function loadVehicleWithSignals(vehicleId, dealershipId) {
  const vehicleResult = await pool.query(
    `SELECT
       v.*,
       FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(v.entry_date, v.created_at))) / 86400)::int AS days_in_stock,
       COUNT(DISTINCT vi.id)::int AS image_count,
       BOOL_OR(COALESCE(vi.is_main, false) OR COALESCE(vi.is_cover, false)) AS has_main_image,
       COUNT(DISTINCT vpt.id) FILTER (WHERE vpt.status <> 'done')::int AS pending_preparation_tasks,
       COUNT(DISTINCT vpt.id) FILTER (WHERE vpt.status = 'done')::int AS completed_preparation_tasks
     FROM vehicles v
     LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id
     LEFT JOIN vehicle_preparation_tasks vpt ON vpt.vehicle_id = v.id
     WHERE v.id = $1 AND v.dealership_id = $2
     GROUP BY v.id`,
    [vehicleId, dealershipId]
  );

  const vehicle = vehicleResult.rows[0];
  if (!vehicle) throw new Error("Veiculo nao encontrado");
  return vehicle;
}

async function loadVehicleImages(vehicleId) {
  const imagesResult = await pool.query(
    `SELECT *
     FROM vehicle_images
     WHERE vehicle_id = $1
     ORDER BY is_main DESC NULLS LAST, sort_order ASC NULLS LAST, id ASC`,
    [vehicleId]
  );
  return imagesResult.rows;
}

async function generateAd(data, user) {
  const vehicle = await loadVehicleWithSignals(data.vehicle_id, user.dealership_id);
  const images = await loadVehicleImages(vehicle.id);
  const platform = data.platform || "instagram";
  const intelligence = calculateVehicleSignals(vehicle);
  const copy = buildAdCopy(vehicle, platform);
  const checklist = buildChecklist(vehicle, images, intelligence);
  const photoPlan = buildPhotoPlan(images);

  return repo.create({
    dealership_id: user.dealership_id,
    vehicle_id: vehicle.id,
    title: data.title || copy.title,
    description: data.description || copy.description,
    platform,
    status: checklist.every((item) => item.done) ? "ready" : "draft",
    metadata: {
      caption: copy.caption,
      hashtags: copy.hashtags,
      checklist,
      photo_plan: photoPlan,
      platform_name: copy.platform_name,
      portal_fields: {
        brand: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        fuel: vehicle.fuel,
        transmission: vehicle.transmission,
        color: vehicle.color,
        fipe_price: vehicle.fipe_price
      },
      intelligence: {
        ad_quality_score: intelligence.ad_quality_score,
        margin: intelligence.margin,
        margin_percent: intelligence.margin_percent,
        fipe_difference_percent: intelligence.fipe_difference_percent,
        suggestions: intelligence.suggestions
      },
      images: images.map((image) => image.image_url),
      generated_by: "autodriv_ad_preparation"
    }
  });
}

async function listAds(vehicleId, user) {
  return repo.findByVehicle(vehicleId, user.dealership_id);
}

module.exports = {
  generateAd,
  listAds
};
