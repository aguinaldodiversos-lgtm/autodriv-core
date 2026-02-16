const service = require("./auth.service");

async function register(req, res) {
  try {
    const result = await service.register(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  register,
  login
};
