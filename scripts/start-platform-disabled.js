console.error(
  [
    "start:platform esta congelado.",
    "A API publica suportada e `npm start` (Express em src/server.js).",
    "Reative este runtime somente quando houver paridade de rotas, auth e testes."
  ].join("\n")
);

process.exit(1);
