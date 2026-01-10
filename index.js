const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const subscriptions = {};

app.post("/webhook/mercadopago", (req, res) => {
  const email = req.body.payer?.email;
  if (email) subscriptions[email] = "ATIVO";
  res.sendStatus(200);
});

app.get("/status", (req, res) => {
  const email = req.query.id;
  if (subscriptions[email] === "ATIVO") return res.json({ status: "ATIVO" });
  res.json({ status: "BLOQUEADO" });
});

app.get("/", (req,res)=>res.send("AutoDriv Core Online"));
app.listen(3000);

