const { INTENTS } = require("./intent-classifier");

function handoffMessage(settings) {
  return (
    settings.ai_graceful_handoff_message ||
    "Perfeito, vou encaminhar voce para um vendedor continuar o atendimento com mais precisao."
  );
}

function buildControlledReply({ classification, settings = {}, shouldEscalate = false }) {
  if (shouldEscalate) {
    return handoffMessage(settings);
  }

  switch (classification.intent) {
    case INTENTS.BUY_INTENT:
      if (classification.entities.vehicle) {
        return "Otima escolha. Vou registrar seu interesse nesse veiculo. Voce pretende comprar a vista, financiar ou colocar algum carro na troca?";
      }
      return "Perfeito. Voce esta buscando algum modelo especifico ou quer ver as melhores opcoes disponiveis? Tambem posso registrar financiamento ou troca.";

    case INTENTS.TRADE_IN:
      return "Consigo iniciar sua avaliacao de troca. Me envie marca, modelo, ano, versao, quilometragem e uma breve descricao do estado do veiculo.";

    case INTENTS.FINANCING:
      return "Podemos iniciar uma simulacao. Qual valor aproximado voce pretende dar de entrada? Se tiver veiculo na troca, tambem posso registrar.";

    case INTENTS.APPRAISAL:
      return "Consigo iniciar sua avaliacao. Me envie marca, modelo, ano, versao, quilometragem e estado geral. A avaliacao final sera confirmada por um vendedor.";

    case INTENTS.GENERAL_QUESTION:
      return "Consigo te ajudar. Para responder com mais precisao, me diga qual informacao voce precisa ou qual veiculo esta olhando.";

    case INTENTS.SUPPORT_OR_POST_SALE:
      return handoffMessage(settings);

    case INTENTS.UNKNOWN:
    default:
      return "Pode me dar um pouco mais de detalhe? Posso te ajudar com compra, troca, financiamento, avaliacao ou atendimento da loja.";
  }
}

module.exports = {
  buildControlledReply,
  handoffMessage
};
