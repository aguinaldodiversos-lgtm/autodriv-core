const express = require("express");
const controller = require("./fipe.controller");

const router = express.Router();

router.get("/brands", controller.brands);
router.get("/models", controller.models);
router.get("/years", controller.years);
router.get("/value", controller.value);

module.exports = router;
