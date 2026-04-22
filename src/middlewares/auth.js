// Compat shim: rotas legadas que importavam "./middlewares/auth" recebem o
// middleware canônico. A lógica antiga (que validava subscription sem checar
// o user no DB) permitia tokens de usuários deletados — foi descontinuada.
// Ver middlewares/auth.middleware.js para o contrato único de req.user.
module.exports = require("./auth.middleware");
