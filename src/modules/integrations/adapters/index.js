const carrosNaCidade = require("./carrosNaCidade.adapter");
const instagram = require("./instagram.adapter");
const portalGeneric = require("./portalGeneric.adapter");

const channelAliases = {
  "carros-na-cidade": "carros_na_cidade",
  carros_na_cidade: "carros_na_cidade",
  instagram: "instagram",
  instagram_feed: "instagram",
  instagram_story: "instagram_story",
  "instagram-story": "instagram_story",
  portal: "portal_generic",
  portal_generic: "portal_generic",
  "portal-generico": "portal_generic"
};

function normalizeChannel(channel) {
  const normalized = channelAliases[String(channel || "").trim().toLowerCase()];
  if (!normalized) {
    const err = new Error("Canal de publicacao nao suportado");
    err.statusCode = 400;
    err.payload = {
      error: "UNSUPPORTED_PUBLICATION_CHANNEL",
      message: "Canal de publicacao nao suportado."
    };
    throw err;
  }
  return normalized;
}

function getAdapter(channel) {
  const normalized = normalizeChannel(channel);
  const adapter = {
    carros_na_cidade: carrosNaCidade,
    instagram,
    instagram_story: instagram,
    portal_generic: portalGeneric
  }[normalized];

  return {
    channel: normalized,
    adapter
  };
}

module.exports = {
  normalizeChannel,
  getAdapter
};
