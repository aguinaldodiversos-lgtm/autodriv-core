// Entry point unificado de workers em processo dedicado.
// Hoje o sistema ainda não opera jobs dedicados; follow-up/IA rodam
// inline no request handler. A Fase 4 do plano vai introduzir
// BullMQ + Redis aqui (filas "followups", "ai-seller", "integrations").
//
// Mantido como stub para que `npm run worker` não quebre.

console.warn(
  "[workers] Nenhum worker em processo dedicado configurado. Ver plano Fase 4 (BullMQ + Redis)."
);
process.exit(0);
