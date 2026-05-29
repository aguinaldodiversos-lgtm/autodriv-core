const axios = require("axios");

async function publish(payload) {
  const url = process.env.PORTAL_GENERIC_API_URL;
  const token = process.env.PORTAL_GENERIC_API_TOKEN;

  if (!url || !token) {
    return {
      id: null,
      status: "prepared",
      provider: "portal_generic",
      needs_configuration: true,
      message: "Payload preparado. Configure PORTAL_GENERIC_API_URL e PORTAL_GENERIC_API_TOKEN para envio real."
    };
  }

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    timeout: 20000
  });

  return {
    id: response.data?.id || response.data?.external_id || null,
    status: "published",
    provider: "portal_generic",
    raw: response.data
  };
}

module.exports = {
  publish
};
