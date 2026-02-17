function detectBudget(message) {
  const match = message.match(/(\d{3,5})/);
  if (match) return match[1];
  return null;
}

module.exports = detectBudget;
