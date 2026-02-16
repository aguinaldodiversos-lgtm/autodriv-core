const express = require("express");
const authRoutes = require("./modules/auth/auth.routes");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AutoDriv Core API");
});

app.use("/api/auth", authRoutes);

module.exports = app;
