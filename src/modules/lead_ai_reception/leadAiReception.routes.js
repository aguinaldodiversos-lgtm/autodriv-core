const express = require("express");
const controller = require("./leadAiReception.controller");

const router = express.Router();

router.post("/message", controller.message);

module.exports = router;
