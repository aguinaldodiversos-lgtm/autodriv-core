const express = require("express");
const controller = require("./whatsapp.controller");
const auth = require("../../middlewares/auth.middleware");
const checkPlanLimit = require("../../middlewares/plan.middleware");

const router = express.Router();

/* =====================================================
   CONECTAR WHATSAPP (APENAS MASTER)
===================================================== */
router.post(
  "/connect",
  auth,
  checkPlanLimit("whatsapp"),
  controller.connect
);

module.exports = router;
