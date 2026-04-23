const express = require("express");
const controller = require("./maintenance.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.post("/", auth, controller.create);
router.get("/vehicle/:vehicleId", auth, controller.getByVehicle);
router.put("/task/:taskId", auth, controller.updateTask);
router.put("/vehicle/:vehicleId/documentation", auth, controller.updateDocumentation);

module.exports = router;
