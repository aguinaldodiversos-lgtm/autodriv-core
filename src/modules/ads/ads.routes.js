const express = require("express");
const controller = require("./ads.controller");
const auth = require("../../middlewares/auth");
const { requireBillingEntitlement } = require("../billing/entitlement.guard");

const router = express.Router();

router.post("/generate", auth, requireBillingEntitlement("ads:generate"), controller.generate);
router.get("/vehicle/:vehicleId", auth, controller.list);

module.exports = router;
