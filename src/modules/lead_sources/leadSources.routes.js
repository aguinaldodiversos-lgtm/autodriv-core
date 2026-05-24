const express = require("express");
const auth = require("../../middlewares/auth");
const controller = require("./leadSources.controller");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/", auth, controller.create);
router.put("/:id", auth, controller.update);

module.exports = router;
