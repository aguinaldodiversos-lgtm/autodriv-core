const express = require("express");
const controller = require("./aiSeller.controller");

const router = express.Router();

router.post("/message", controller.message);

module.exports = router;
