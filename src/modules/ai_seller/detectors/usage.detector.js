function detectUsage(message) {
  const msg = message.toLowerCase();

  if (msg.includes("trabalho") || msg.includes("dia a dia")) {
    return "daily_use";
  }

  if (msg.includes("família") || msg.includes("familia")) {
    return "family";
  }

  if (msg.includes("viagem") || msg.includes("estrada")) {
    return "travel";
  }

  return null;
}

module.exports = detectUsage;
