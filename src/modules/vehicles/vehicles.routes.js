const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");

const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  applyVehicleSuggestion
} = require("./vehicles.controller");

/* =========================
   LISTAR VEÍCULOS
   GET /api/vehicles
========================= */
router.get("/", auth, getVehicles);

/* =========================
   BUSCAR VEÍCULO POR ID
   GET /api/vehicles/:id
========================= */
router.get("/:id", auth, getVehicleById);

/* =========================
   CRIAR VEÍCULO
   POST /api/vehicles
========================= */
router.post("/", auth, createVehicle);

/* =========================
   ATUALIZAR VEÍCULO
   PUT /api/vehicles/:id
========================= */
router.put("/:id", auth, updateVehicle);

/* =========================
   EXCLUIR VEÍCULO
   DELETE /api/vehicles/:id
========================= */
router.delete("/:id", auth, deleteVehicle);

/* =========================
   APLICAR SUGESTÃO AUTOMÁTICA
   - gera anúncio com IA
   - envia para Carros na Cidade
   - destaca veículo
   POST /api/vehicles/:id/apply-suggestion
========================= */
router.post(
  "/:id/apply-suggestion",
  auth,
  applyVehicleSuggestion
);

module.exports = router;
