function detectName(message) {
  const match = message.match(/meu nome é ([a-zA-ZÀ-ÿ]+)/i);
  if (match) return match[1];
  return null;
}

module.exports = detectName;
