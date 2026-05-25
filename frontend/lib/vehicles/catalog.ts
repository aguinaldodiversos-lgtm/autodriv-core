export type VehicleCatalogBrand = {
  brand: string;
  models: string[];
};

export const vehicleCatalog: VehicleCatalogBrand[] = [
  { brand: "Chevrolet", models: ["Onix", "Prisma", "Tracker", "Cruze", "S10", "Spin", "Cobalt"] },
  { brand: "BYD", models: ["Dolphin", "Dolphin Mini", "Song Plus", "Yuan Plus", "Seal", "Tan", "Han"] },
  { brand: "Caoa Chery", models: ["Tiggo 5X", "Tiggo 7", "Tiggo 8", "Arrizo 6"] },
  { brand: "Fiat", models: ["Argo", "Cronos", "Mobi", "Strada", "Toro", "Pulse", "Fastback", "Uno"] },
  { brand: "Ford", models: ["Ka", "EcoSport", "Ranger", "Fiesta", "Focus", "Territory"] },
  { brand: "GWM", models: ["Haval H6", "Ora 03", "Tank 300"] },
  { brand: "Honda", models: ["Civic", "City", "Fit", "HR-V", "WR-V", "CR-V"] },
  { brand: "Hyundai", models: ["HB20", "Creta", "Tucson", "ix35", "Santa Fe"] },
  { brand: "Jeep", models: ["Renegade", "Compass", "Commander"] },
  { brand: "Nissan", models: ["Kicks", "Versa", "March", "Frontier", "Sentra"] },
  { brand: "Peugeot", models: ["208", "2008", "308", "3008"] },
  { brand: "Renault", models: ["Kwid", "Sandero", "Logan", "Duster", "Captur", "Oroch"] },
  { brand: "Toyota", models: ["Corolla", "Corolla Cross", "Hilux", "SW4", "Etios", "Yaris", "RAV4"] },
  { brand: "Volkswagen", models: ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Saveiro", "Voyage", "Fox", "Jetta"] }
];

export const fuelOptions = ["Flex", "Gasolina", "Diesel", "Hibrido", "Eletrico", "GNV"];
export const transmissionOptions = ["Manual", "Automatico", "CVT", "Automatizado"];

export function getCatalogBrands(extraBrands: Array<string | null | undefined> = []) {
  return Array.from(
    new Set([
      ...vehicleCatalog.map((item) => item.brand),
      ...extraBrands.map((brand) => String(brand || "").trim()).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b));
}

export function getCatalogModels(brand: string, extraModels: Array<string | null | undefined> = []) {
  const catalogModels =
    vehicleCatalog.find((item) => item.brand.toLowerCase() === brand.toLowerCase())?.models || [];

  return Array.from(
    new Set([
      ...catalogModels,
      ...extraModels.map((model) => String(model || "").trim()).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b));
}

export function getYearOptions() {
  const currentYear = new Date().getFullYear() + 1;
  return Array.from({ length: currentYear - 1980 + 1 }, (_, index) => String(currentYear - index));
}
