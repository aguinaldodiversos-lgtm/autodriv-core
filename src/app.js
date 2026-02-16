const express = require("express");

const authRoutes = require("./modules/auth/auth.routes");
const vehicleRoutes = require("./modules/vehicles/vehicles.routes");
const clientRoutes = require("./modules/clients/clients.routes");
const leadRoutes = require("./modules/leads/leads.routes");
const proposalRoutes = require("./modules/proposals/proposals.routes");
const salesRoutes = require("./modules/sales/sales.routes");
const financeRoutes = require("./modules/finance/finance.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("AutoDriv Core API");
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

module.exports = app;
