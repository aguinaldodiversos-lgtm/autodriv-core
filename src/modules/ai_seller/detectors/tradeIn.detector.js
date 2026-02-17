function detectTradeIn(message) {
  const msg = message.toLowerCase();

  if (
    msg.includes("troca") ||
    msg.includes("meu carro") ||
    msg.includes("dar o meu")
  ) {
    return true;
  }

  return null;
}

module.exports = detectTradeIn;
