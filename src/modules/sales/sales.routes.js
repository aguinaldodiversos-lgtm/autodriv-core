const express = require("express");
const controller = require("./sales.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/", auth, controller.create);

module.exports = router;
