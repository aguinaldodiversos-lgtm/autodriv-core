const express = require("express");

/* =========================
   IMPORTAÇÃO DE ROTAS
========================= */
const authRoutes = require("./modules/auth/auth.routes");
const vehicleRoutes = require("./modules/vehicles/vehicles.routes");
const clientRoutes = require("./modules/clients/clients.routes");
const leadRoutes = require("./modules/leads/leads.routes");
const proposalRoutes = require("./modules/proposals/proposals.routes");
const salesRoutes = require("./modules/sales/sales.routes");
const financeRoutes = require("./modules/finance/finance.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const maintenanceRoutes = require("./modules/maintenance/maintenance.routes");
const adsRoutes = require("./modules/ads/ads.routes");
const publicRoutes = require("./modules/public/public.routes");
const imagesRoutes = require("./modules/images/images.routes");
const integrationsRoutes = require("./modules/integrations/integrations.routes");
const aiSellerRoutes = require("./modules/ai_seller/aiSeller.routes");
const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes");
const aiSettingsRoutes = require("./modules/ai_settings/aiSettings.routes");

const app = express();

/* =========================
   MIDDLEWARES GLOBAIS
========================= */
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("AutoDriv Core API");
});

/* =========================
   ROTAS PRIVADAS (CRM)
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/images", imagesRoutes);
app.use("/api/integrations", integrationsRoutes);

/* =========================
   VENDEDOR IA
========================= */
app.use("/api/ai-seller", aiSellerRoutes);

/* =========================
   CONFIGURAÇÕES DA IA
========================= */
app.use("/api/ai-settings", aiSettingsRoutes);

/* =========================
   WHATSAPP (WEBHOOK)
========================= */
app.use("/api/whatsapp", whatsappRoutes);

/* =========================
   ROTAS PÚBLICAS
========================= */
app.use("/public", publicRoutes);

/* =========================
   404 - ROTA NÃO ENCONTRADA
========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

/* =========================
   ERROR HANDLER GLOBAL
========================= */
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

module.exports = app;
