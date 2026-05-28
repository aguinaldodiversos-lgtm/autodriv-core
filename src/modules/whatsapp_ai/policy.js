const FORBIDDEN_PATTERNS = [
  {
    key: "credit_approval",
    pattern: /\b(aprovacao garantida|credito aprovado|financiamento aprovado|aprova com certeza)\b/i
  },
  {
    key: "invented_discount",
    pattern: /\b(desconto garantido|menor preco garantido|fecho por|consigo por r\$)\b/i
  },
  {
    key: "confirmed_availability",
    pattern: /\b(esta disponivel|disponibilidade confirmada|garanto que esta na loja)\b/i
  },
  {
    key: "reservation",
    pattern: /\b(reservei|esta reservado|segurei o carro)\b/i
  },
  {
    key: "sensitive_data",
    pattern: /\b(cartao|senha|codigo de seguranca|cvv|documento por foto|rg|cpf completo)\b/i
  },
  {
    key: "unauthorized_link",
    pattern: /https?:\/\/(?!autodriv|wa\.me|api\.whatsapp\.com)/i
  }
];

function validateReply(reply) {
  const text = String(reply || "").trim();
  if (!text) {
    return { allowed: false, reason: "empty_reply" };
  }
  if (text.length > 400) {
    return { allowed: false, reason: "reply_too_long" };
  }

  const forbidden = FORBIDDEN_PATTERNS.find((item) => item.pattern.test(text));
  if (forbidden) {
    return { allowed: false, reason: forbidden.key };
  }

  return { allowed: true, reason: null };
}

function isOptOut(message) {
  return /\b(parar|cancelar|nao quero|não quero|remover|sair|descadastrar)\b/i.test(
    String(message || "")
  );
}

function safeFallbackReply() {
  return "Recebemos sua mensagem. Um vendedor vai continuar seu atendimento em breve.";
}

module.exports = {
  validateReply,
  isOptOut,
  safeFallbackReply
};
