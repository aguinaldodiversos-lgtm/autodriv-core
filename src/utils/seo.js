function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function buildVehicleSlug(vehicle) {
  return slugify(`${vehicle.brand}-${vehicle.model}-${vehicle.year}`);
}

function buildSeoTitle(vehicle, dealership) {
  return `${vehicle.brand} ${vehicle.model} ${vehicle.year} à venda em ${dealership.name}`;
}

function buildSeoDescription(vehicle, dealership) {
  return `Compre ${vehicle.brand} ${vehicle.model} ${vehicle.year} na ${dealership.name}. Veículo revisado, com procedência e pronto para transferência. Confira o estoque completo.`;
}

module.exports = {
  slugify,
  buildVehicleSlug,
  buildSeoTitle,
  buildSeoDescription
};
