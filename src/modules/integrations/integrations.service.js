const pool = require("../../config/db");
const repo = require("./integrations.repository");
const adPreparation = require("../ad_preparation/adPreparation.service");
const { buildPublicationPayload } = require("./publicationPayload");
const { getAdapter, normalizeChannel } = require("./adapters");

function httpError(message, statusCode, payload) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.payload = payload;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) {
    throw httpError("Loja nao associada ao usuario", 403, {
      error: "DEALERSHIP_REQUIRED",
      message: "Loja nao associada ao usuario."
    });
  }
  return user.dealership_id;
}

function publicErrorMessage(err) {
  if (!err) return "Erro ao publicar anuncio";
  if (err.response?.data?.error) return String(err.response.data.error);
  if (err.response?.data?.message) return String(err.response.data.message);
  return String(err.message || "Erro ao publicar anuncio");
}

async function loadVehicle(vehicleId, did) {
  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles
     WHERE id = $1 AND dealership_id = $2`,
    [vehicleId, did]
  );

  const vehicle = vehicleResult.rows[0];
  if (!vehicle) {
    throw httpError("Veiculo nao encontrado", 404, {
      error: "VEHICLE_NOT_FOUND",
      message: "Veiculo nao encontrado."
    });
  }
  return vehicle;
}

async function loadVehicleImages(vehicleId, did) {
  const imagesResult = await pool.query(
    `SELECT * FROM vehicle_images
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY is_main DESC NULLS LAST, sort_order ASC NULLS LAST, id ASC`,
    [vehicleId, did]
  );

  return imagesResult.rows;
}

async function recordBlockedAttempt({ vehicleId, did, channel, payload, evaluation }) {
  let attempt = null;
  try {
    attempt = await repo.createAttempt({
      dealership_id: did,
      vehicle_id: vehicleId,
      platform: channel,
      status: "blocked",
      status_detail: "ad_not_ready_to_publish",
      payload,
      last_error: "Este veiculo ainda possui pendencias antes da publicacao.",
      last_error_at: new Date(),
      published_at: null
    });
  } catch {
    attempt = null;
  }

  throw httpError("Este veiculo ainda possui pendencias antes da publicacao.", 422, {
    error: "AD_NOT_READY_TO_PUBLISH",
    message: "Este veiculo ainda possui pendencias antes da publicacao.",
    score: evaluation.score,
    blockingReasons: evaluation.blockingReasons,
    warnings: evaluation.warnings,
    integration: attempt ? { id: attempt.id, status: attempt.status, platform: attempt.platform } : null
  });
}

async function publishToChannel(vehicleId, user, channel, options = {}) {
  const did = dealershipId(user);
  const { channel: normalizedChannel, adapter } = getAdapter(channel);
  const [evaluation, vehicle] = await Promise.all([
    adPreparation.evaluate(vehicleId, user, { persist: true }),
    loadVehicle(vehicleId, did)
  ]);
  const images = await loadVehicleImages(vehicleId, did);
  const payload = buildPublicationPayload({
    channel: normalizedChannel,
    vehicle,
    images,
    preparation: evaluation,
    options
  });

  if (!evaluation.canPublish) {
    await recordBlockedAttempt({
      vehicleId,
      did,
      channel: normalizedChannel,
      payload,
      evaluation
    });
  }

  const attempt = await repo.createAttempt({
    dealership_id: did,
    vehicle_id: vehicleId,
    platform: normalizedChannel,
    status: "pending",
    status_detail: "sending",
    payload
  });

  try {
    const external = await adapter.publish(payload, { user, options });
    const finalStatus = external.status || "published";
    return repo.markAttemptPublished(attempt.id, did, {
      external_id: external.id || null,
      external_url: external.url || external.external_url || null,
      status: finalStatus,
      status_detail: external.needs_configuration
        ? "needs_configuration"
        : external.needs_implementation
          ? "needs_implementation"
          : "sent",
      payload: {
        ...payload,
        provider_response: {
          provider: external.provider || normalizedChannel,
          id: external.id || null,
          status: finalStatus,
          needs_configuration: Boolean(external.needs_configuration),
          needs_implementation: Boolean(external.needs_implementation),
          message: external.message || null
        }
      }
    });
  } catch (err) {
    const failed = await repo.markAttemptFailed(attempt.id, did, {
      status: "failed",
      status_detail: err.statusCode === 503 ? "provider_not_configured" : "provider_error",
      last_error: publicErrorMessage(err)
    });
    throw httpError("Nao foi possivel publicar neste canal.", err.statusCode || 502, {
      error: "EXTERNAL_PUBLICATION_FAILED",
      message: "Nao foi possivel publicar neste canal.",
      channel: normalizedChannel,
      integration: failed ? { id: failed.id, status: failed.status, error: failed.last_error } : null
    });
  }
}

async function publishToCarrosNaCidade(vehicleId, user) {
  return publishToChannel(vehicleId, user, "carros_na_cidade");
}

async function listVehicleIntegrations(vehicleId, user) {
  const did = dealershipId(user);
  await loadVehicle(vehicleId, did);
  return repo.listByVehicle(vehicleId, did);
}

module.exports = {
  normalizeChannel,
  publishToChannel,
  publishToCarrosNaCidade,
  listVehicleIntegrations
};
