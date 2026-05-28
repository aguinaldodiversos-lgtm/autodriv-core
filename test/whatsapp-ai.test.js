const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}

const classifier = require(path.join("..", "src", "modules", "whatsapp_ai", "intent-classifier"));
const policy = require(path.join("..", "src", "modules", "whatsapp_ai", "policy"));
const repo = require(path.join("..", "src", "modules", "whatsapp_ai", "whatsappAi.repository"));
const service = require(path.join("..", "src", "modules", "whatsapp_ai", "whatsappAi.service"));

const originalRepo = {};
for (const [key, value] of Object.entries(repo)) {
  originalRepo[key] = value;
}

function restoreRepo() {
  for (const [key, value] of Object.entries(originalRepo)) {
    repo[key] = value;
  }
}

function baseSettings() {
  return {
    ai_whatsapp_enabled: true,
    ai_auto_reply_enabled: true,
    ai_handoff_enabled: true,
    ai_max_auto_messages_per_lead: 5,
    ai_escalation_threshold: 70,
    ai_low_confidence_threshold: 0.65,
    ai_unknown_retry_limit: 1,
    ai_graceful_handoff_message:
      "Perfeito, vou encaminhar voce para um vendedor continuar o atendimento com mais precisao."
  };
}

function baseLead(overrides = {}) {
  return {
    id: 10,
    dealership_id: 7,
    name: "Lead WhatsApp",
    assigned_user_id: null,
    ai_whatsapp_status: "enabled",
    ai_auto_message_count: 0,
    metadata: {},
    ...overrides
  };
}

function stubHappyPath({ lead = baseLead(), duplicate = false } = {}) {
  const calls = {
    actions: 0,
    outbound: 0,
    sent: []
  };

  repo.normalizePhone = (phone) => String(phone).replace(/\D/g, "");
  repo.getSettings = async () => baseSettings();
  repo.findOrCreateLead = async () => ({ lead, created: false });
  repo.upsertWhatsAppThread = async () => ({ id: 22 });
  repo.saveConversationMessage = async (payload) => {
    if (payload.direction === "inbound" && duplicate) {
      return { row: null, duplicate: true };
    }
    if (payload.direction === "outbound") calls.outbound += 1;
    return { row: { id: 99 }, duplicate: false };
  };
  repo.logAiEvent = async () => {};
  repo.markOptOut = async () => ({ ...lead, ai_whatsapp_status: "opted_out" });
  repo.updateThreadStatus = async () => {};
  repo.updateLeadAfterAnalysis = async (payload) => ({
    ...lead,
    status: payload.nextStatus,
    ai_whatsapp_status: payload.aiStatus
  });
  repo.incrementAutoMessageCount = async () => ({ ...lead, ai_auto_message_count: 1 });
  repo.createSellerAction = async () => {
    calls.actions += 1;
    return { id: 44 };
  };

  return calls;
}

describe("whatsapp-ai classifier", () => {
  afterEach(restoreRepo);

  test("classifica compra com veiculo e lead quente", () => {
    const result = classifier.classifyIntent("Tenho interesse no Civic 2020, qual o menor valor?");
    assert.strictEqual(result.intent, "BUY_INTENT");
    assert.strictEqual(result.entities.vehicle.toLowerCase().includes("civic"), true);
    assert.strictEqual(result.shouldEscalate, true);
  });

  test("classifica troca, financiamento, avaliacao, suporte e desconhecida", () => {
    assert.strictEqual(classifier.classifyIntent("Aceita meu Onix 2020 na troca?").intent, "TRADE_IN");
    assert.strictEqual(classifier.classifyIntent("Quanto fica a parcela com entrada?").intent, "FINANCING");
    assert.strictEqual(classifier.classifyIntent("Quero vender meu carro, voces avaliam?").intent, "APPRAISAL");
    assert.strictEqual(classifier.classifyIntent("Comprei e tive problema com documento").intent, "SUPPORT_OR_POST_SALE");
    assert.strictEqual(classifier.classifyIntent("👍").intent, "UNKNOWN");
  });
});

describe("whatsapp-ai policy", () => {
  afterEach(restoreRepo);

  test("bloqueia promessa de financiamento e disponibilidade inventada", () => {
    assert.strictEqual(
      policy.validateReply("Seu financiamento aprovado com certeza.").allowed,
      false
    );
    assert.strictEqual(
      policy.validateReply("O carro esta disponivel e eu garanto que esta na loja.").allowed,
      false
    );
  });

  test("respeita opt-out", () => {
    assert.strictEqual(policy.isOptOut("Pode remover meu contato"), true);
  });
});

describe("whatsapp-ai service", () => {
  afterEach(restoreRepo);

  test("nao processa provider_message_id duplicado duas vezes", async () => {
    const calls = stubHappyPath({ duplicate: true });
    const result = await service.processInboundMessage({
      dealershipId: 7,
      phone: "55 11 99999-0000",
      text: "Tenho interesse no Civic",
      providerMessageId: "msg-1"
    });

    assert.strictEqual(result.duplicate, true);
    assert.strictEqual(calls.outbound, 0);
    assert.strictEqual(calls.actions, 0);
  });

  test("lead quente gera seller_action, handoff e resposta curta", async () => {
    const calls = stubHappyPath();
    const result = await service.processInboundMessage({
      dealershipId: 7,
      phone: "5511999990000",
      text: "Tenho interesse no Civic 2020 e quero visitar hoje. Qual o menor valor?",
      providerMessageId: "msg-2",
      sendMessage: async (reply) => calls.sent.push(reply)
    });

    assert.strictEqual(result.handoffToHuman, true);
    assert.strictEqual(calls.actions, 1);
    assert.strictEqual(calls.outbound, 1);
    assert.match(calls.sent[0], /vendedor/);
  });

  test("opt-out arquiva lead e nao envia resposta automatica", async () => {
    const calls = stubHappyPath();
    const result = await service.processInboundMessage({
      dealershipId: 7,
      phone: "5511999990000",
      text: "Nao quero mais, pode remover",
      providerMessageId: "msg-3",
      sendMessage: async (reply) => calls.sent.push(reply)
    });

    assert.strictEqual(result.optedOut, true);
    assert.strictEqual(calls.sent.length, 0);
    assert.strictEqual(calls.outbound, 0);
  });

  test("humano ativo salva inbound e nao responde", async () => {
    const calls = stubHappyPath({
      lead: baseLead({ ai_whatsapp_status: "human_required" })
    });

    const result = await service.processInboundMessage({
      dealershipId: 7,
      phone: "5511999990000",
      text: "Oi, ainda estou aguardando",
      providerMessageId: "msg-4",
      sendMessage: async (reply) => calls.sent.push(reply)
    });

    assert.strictEqual(result.skippedAutoReply, true);
    assert.strictEqual(calls.sent.length, 0);
  });
});
