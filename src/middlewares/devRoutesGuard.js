const crypto = require("crypto");

const HEADER = "x-dev-routes-secret";

function safeEqualString(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    return false;
  }
  if (ba.length === 0) {
    return true;
  }
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Protege rotas de desenvolvimento: segredo compartilhado em header dedicado
 * (não usar em produção — rotas /api/dev não se montam com NODE_ENV=production).
 */
function devRoutesGuard(req, res, next) {
  const expected = process.env.DEV_ROUTES_SECRET;
  if (!expected || String(expected).length < 16) {
    return res.status(500).json({
      error: "Configuração inválida: DEV_ROUTES_SECRET (mín. 16 caracteres) inexistente."
    });
  }
  const got = req.headers[HEADER] || req.headers[HEADER.toLowerCase()];
  const s = Array.isArray(got) ? got[0] : got;
  if (!safeEqualString(s ? String(s).trim() : "", String(expected).trim())) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
}

module.exports = { devRoutesGuard, devRoutesHeaderName: HEADER };
