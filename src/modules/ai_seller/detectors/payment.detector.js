function detectPaymentType(message) {
  const msg = message.toLowerCase();

  if (
    msg.includes("à vista") ||
    msg.includes("avista") ||
    msg.includes("dinheiro")
  ) {
    return "cash";
  }

  if (
    msg.includes("financ") ||
    msg.includes("parcel") ||
    msg.includes("entrada")
  ) {
    return "finance";
  }

  return null;
}

module.exports = detectPaymentType;
