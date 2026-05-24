/**
 * IP cliente para rate limiting. Com `app.set("trust proxy", n)` o Express
 * preenche `req.ip` a partir de `X-Forwarded-For` (ver docs/OPERATIONS.md).
 * @param {import("express").Request} req
 * @returns {string}
 */
function getClientIpForRateLimit(req) {
  if (req.ip) return String(req.ip);
  const sock = req.socket;
  if (sock && sock.remoteAddress) return String(sock.remoteAddress);
  return "unknown";
}

module.exports = { getClientIpForRateLimit };
