const express = require("express");
const controller = require("./leadSources.controller");

const router = express.Router();

router.post("/leads/:sourceKey", controller.webhook);

module.exports = router;
