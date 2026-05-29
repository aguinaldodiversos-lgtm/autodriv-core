function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}

function vehicleTitle(vehicle) {
  return vehicle.title || [vehicle.brand, vehicle.model, vehicle.version, vehicle.year].filter(Boolean).join(" ");
}

function imageUrl(image) {
  return image.image_url || image.url || image.secure_url || null;
}

function buildPublicationPayload({ channel, vehicle, images, preparation, options = {} }) {
  const title = vehicleTitle(vehicle);
  const salePrice = Number(vehicle.price || 0);
  const fipePrice = Number(vehicle.fipe_price || 0);
  const imageUrls = images.map(imageUrl).filter(Boolean);
  const mainImage = images.find((image) => image.is_main || image.is_cover) || images[0] || null;

  return {
    schema_version: "2026-05-28",
    channel,
    vehicle_id: vehicle.id,
    dealership_id: vehicle.dealership_id,
    title: String(options.title || title || `Veiculo #${vehicle.id}`).slice(0, 120),
    description: String(
      options.description ||
        vehicle.ad_description ||
        vehicle.seo_description ||
        `${title} disponivel para venda. Consulte condicoes, disponibilidade e agende uma visita.`
    ).slice(0, 3000),
    price: salePrice || null,
    currency: "BRL",
    vehicle: compactObject({
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      year: vehicle.year,
      model_year: vehicle.model_year,
      manufacture_year: vehicle.manufacture_year,
      mileage: vehicle.mileage,
      color: vehicle.color,
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      plate: vehicle.plate,
      fipe_code: vehicle.fipe_code,
      fipe_price: fipePrice || null,
      fipe_reference_month: vehicle.fipe_reference_month
    }),
    media: {
      main_image_url: mainImage ? imageUrl(mainImage) : null,
      image_urls: imageUrls,
      image_count: imageUrls.length
    },
    readiness: {
      can_publish: preparation.canPublish,
      score: preparation.score,
      grade: preparation.grade,
      blocking_reasons: preparation.blockingReasons || [],
      warnings: preparation.warnings || [],
      breakdown: preparation.breakdown || {}
    },
    compliance: {
      source_of_truth: "ad_preparation",
      validated_at: new Date().toISOString(),
      do_not_publish_if_can_publish_false: true
    },
    metadata: compactObject({
      requested_caption: options.caption,
      requested_campaign: options.campaign,
      requested_portal: options.portal,
      tags: Array.isArray(options.tags) ? options.tags : undefined
    })
  };
}

module.exports = {
  buildPublicationPayload
};
