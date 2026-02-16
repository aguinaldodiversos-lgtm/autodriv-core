const express = require("express");
const authRoutes = require("./modules/auth/auth.routes");

const app = express();
const express = require("express");
const authRoutes = require("./modules/auth/auth.routes");
const vehicleRoutes = require("./modules/vehicles/vehicles.routes");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AutoDriv Core API");
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);

module.exports = app;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("AutoDriv Core API");
});

app.use("/api/auth", authRoutes);

module.exports = app;
