const service = require("./tasks.service");

async function list(req, res) {
  try {
    const tasks = await service.listTasks(req.user);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tarefas" });
  }
}

async function complete(req, res) {
  try {
    const task = await service.complete(req.params.id, req.user);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Erro ao concluir tarefa" });
  }
}

module.exports = {
  list,
  complete
};
