function getPriceIntelligence(vehiclePrice, fipePrice) {
  if (!vehiclePrice || !fipePrice) {
    return {
      status: "unknown",
      difference: 0,
      message: "FIPE não disponível"
    };
  }

  const diff = ((vehiclePrice - fipePrice) / fipePrice) * 100;
  const percent = Math.round(diff);

  if (percent <= -5) {
    return {
      status: "below_market",
      difference: percent,
      message: `Preço ${Math.abs(percent)}% abaixo da FIPE (boa atratividade)`
    };
  }

  if (percent <= 5) {
    return {
      status: "market_price",
      difference: percent,
      message: "Preço dentro da média de mercado"
    };
  }

  if (percent <= 10) {
    return {
      status: "above_market",
      difference: percent,
      message: `Preço ${percent}% acima da FIPE`
    };
  }

  return {
    status: "overpriced",
    difference: percent,
    message: `Preço ${percent}% acima da FIPE (chance baixa de venda)`
  };
}

module.exports = {
  getPriceIntelligence
};
