const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Lê `limit`/`offset` de req.query com tetos seguros.
 * - limit: 1..200 (default 50)
 * - offset: >=0 (default 0)
 */
function parsePagination(reqOrQuery, opts = {}) {
  const query = reqOrQuery && reqOrQuery.query ? reqOrQuery.query : (reqOrQuery || {});
  const defaultLimit = opts.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = opts.maxLimit || MAX_LIMIT;

  let limit = toInt(query.limit, defaultLimit);
  if (limit < 1) limit = 1;
  if (limit > maxLimit) limit = maxLimit;

  let offset = toInt(query.offset, 0);
  if (offset < 0) offset = 0;

  return { limit, offset };
}

function buildEnvelope({ items, total, limit, offset }) {
  return {
    items,
    limit,
    offset,
    total: typeof total === "number" ? total : undefined
  };
}

module.exports = {
  parsePagination,
  buildEnvelope,
  DEFAULT_LIMIT,
  MAX_LIMIT
};
