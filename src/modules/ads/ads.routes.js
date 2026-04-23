const express = require("express");
const controller = require("./ads.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.post("/generate", auth, controller.generate);
router.get("/vehicle/:vehicleId", auth, controller.list);

module.exports = router;
