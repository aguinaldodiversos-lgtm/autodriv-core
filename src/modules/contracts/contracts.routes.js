const express = require("express");
const controller = require("./contracts.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/:saleId", auth, controller.create);

module.exports = router;
