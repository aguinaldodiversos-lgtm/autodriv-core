const express = require("express");
const controller = require("./aiSeller.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.post("/message", auth, controller.message);

module.exports = router;
