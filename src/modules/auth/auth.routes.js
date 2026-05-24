const express = require("express");
const controller = require("./auth.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", auth, controller.me);

module.exports = router;
