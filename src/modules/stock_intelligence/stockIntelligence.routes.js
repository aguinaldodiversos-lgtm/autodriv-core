const express = require("express");
const auth = require("../../middlewares/auth");
const controller = require("./stockIntelligence.controller");

const router = express.Router();

router.get("/", auth, controller.list);
router.get("/:vehicleId", auth, controller.get);
router.patch("/:vehicleId", auth, controller.update);
router.post("/:vehicleId/appraisals", auth, controller.appraisal);
router.post("/:vehicleId/preparation-tasks", auth, controller.preparationTask);

module.exports = router;
