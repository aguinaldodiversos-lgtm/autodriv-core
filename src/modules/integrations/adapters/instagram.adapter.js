async function publish(payload) {
  const configured = Boolean(
    process.env.INSTAGRAM_ACCESS_TOKEN &&
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID &&
      process.env.INSTAGRAM_GRAPH_API_URL
  );

  if (!configured) {
    return {
      id: null,
      status: "prepared",
      provider: "instagram",
      needs_configuration: true,
      message: "Payload preparado. Configure Instagram Graph API para envio real."
    };
  }

  return {
    id: null,
    status: "prepared",
    provider: "instagram",
    needs_implementation: true,
    message: "Envio real do Instagram precisa ser conectado ao fluxo oficial Graph API com validacao em sandbox.",
    payload_preview: {
      title: payload.title,
      main_image_url: payload.media.main_image_url,
      image_count: payload.media.image_count
    }
  };
}

module.exports = {
  publish
};
