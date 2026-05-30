const express = require("express");
const controller = require("./proposals.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/", auth, controller.create);
router.post("/:id/accept", auth, controller.accept);
router.put("/:id", auth, controller.update);
router.delete("/:id", auth, controller.remove);

module.exports = router;
