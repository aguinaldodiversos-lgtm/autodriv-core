function detectTimeline(message) {
  const msg = message.toLowerCase();

  if (msg.includes("esse mês") || msg.includes("esse mes")) {
    return "this_month";
  }

  if (msg.includes("ano que vem")) {
    return "next_year";
  }

  if (msg.includes("semana") || msg.includes("logo")) {
    return "soon";
  }

  return null;
}

module.exports = detectTimeline;
