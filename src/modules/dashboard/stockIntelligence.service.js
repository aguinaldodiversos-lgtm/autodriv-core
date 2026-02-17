function getStockStatus(days) {
  if (days <= 15) {
    return {
      status: "healthy",
      color: "green",
      action: "Giro saudável"
    };
  }

  if (days <= 30) {
    return {
      status: "attention",
      color: "yellow",
      action: "Atualizar anúncio e fotos"
    };
  }

  if (days <= 60) {
    return {
      status: "slow",
      color: "orange",
      action: "Reduzir preço ou destacar"
    };
  }

  return {
    status: "critical",
    color: "red",
    action: "Criar campanha urgente"
  };
}

function calculateDaysInStock(entryDate) {
  if (!entryDate) return 0;

  const now = new Date();
  const entry = new Date(entryDate);

  return Math.floor(
    (now - entry) / (1000 * 60 * 60 * 24)
  );
}

module.exports = {
  getStockStatus,
  calculateDaysInStock
};
