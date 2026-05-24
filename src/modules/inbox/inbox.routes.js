const express = require("express");
const controller = require("./inbox.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.list);
router.get("/templates", auth, controller.listTemplates);
router.post("/templates", auth, controller.upsertTemplate);
router.get("/:threadId", auth, controller.get);
router.patch("/:threadId", auth, controller.updateThread);
router.post("/:threadId/claim", auth, controller.claim);
router.post("/:threadId/send", auth, controller.send);

module.exports = router;
