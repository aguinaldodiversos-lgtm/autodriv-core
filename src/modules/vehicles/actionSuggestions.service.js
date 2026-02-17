function getVehicleAction(daysInStock, priceDiff) {
  if (daysInStock < 30) {
    return "Nenhuma ação necessária";
  }

  if (daysInStock < 45) {
    return "Atualizar anúncio e fotos";
  }

  if (daysInStock < 60) {
    return "Reduzir preço entre 3% e 5%";
  }

  if (priceDiff > 10) {
    return "Reduzir preço urgentemente";
  }

  return "Criar campanha promocional";
}

module.exports = {
  getVehicleAction
};
