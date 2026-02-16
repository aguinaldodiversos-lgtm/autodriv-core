const express = require("express");

const authRoutes = require("./modules/auth/auth.routes");
const vehicleRoutes = require("./modules/vehicles/vehicles.routes");
const clientRoutes = require("./modules/clients/clients.routes");
const leadRoutes = require("./modules/leads/leads.routes");
const proposalRoutes = require("./modules/proposals/proposals.routes");
const salesRoutes = require("./modules/sales/sales.routes");

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
   ROTAS DA API
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/sales", salesRoutes);

/* =========================
   ROTA NÃO ENCONTRADA
========================= */
app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada"
  });
});

/* =========================
   TRATAMENTO GLOBAL DE ERROS
========================= */
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);

  res.status(500).json({
    error: "Erro interno do servidor"
  });
});

module.exports = app;
