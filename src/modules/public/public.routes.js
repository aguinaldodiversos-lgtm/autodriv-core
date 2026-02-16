const express = require("express");
const controller = require("./public.controller");

const router = express.Router();

// Página da loja
router.get("/:slug", controller.dealership);

// Página do veículo
router.get("/:slug/:vehicleSlug", controller.vehicle);

module.exports = router;
