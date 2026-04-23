/**
 * @param {Record<string, string | undefined>} query - req.query
 * @param {{ defaultLimit?: number; maxLimit?: number }} [opts]
 */
function parsePagination(query, opts = {}) {
  const defaultLimit = opts.defaultLimit ?? 50;
  const maxLimit = opts.maxLimit ?? 200;

  let limit = parseInt(String(query.limit ?? ""), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  let offset = parseInt(String(query.offset ?? ""), 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

module.exports = { parsePagination };
