const express = require("express");
const controller = require("./aiSeller.controller");
const auth = require("../../middlewares/auth.middleware");
const checkPlanLimit = require("../../middlewares/plan.middleware");

const router = express.Router();

router.post("/message", auth, checkPlanLimit("ia"), controller.message);

module.exports = router;
