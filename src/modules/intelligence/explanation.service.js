const OpenAI = require("openai");

let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return client;
}

function fallbackExplanation(action) {
  return `${action.reason}. Acao recomendada: ${action.suggested_action}`;
}

async function explainAction(action) {
  if (
    process.env.INTELLIGENCE_EXPLAIN_WITH_OPENAI !== "true" ||
    !process.env.OPENAI_API_KEY
  ) {
    return fallbackExplanation(action);
  }

  try {
    const response = await getClient().chat.completions.create({
      model: process.env.INTELLIGENCE_OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "Explique recomendacoes operacionais para lojistas de carros em portugues do Brasil. Seja direto, pratico e nao invente dados."
        },
        {
          role: "user",
          content: JSON.stringify({
            type: action.type,
            priority: action.priority_label,
            reason: action.reason,
            suggested_action: action.suggested_action,
            evidence: action.evidence
          })
        }
      ]
    });

    return (
      response.choices?.[0]?.message?.content?.trim() ||
      fallbackExplanation(action)
    );
  } catch (err) {
    return fallbackExplanation(action);
  }
}

async function explainActions(actions) {
  const explained = [];
  for (const action of actions) {
    explained.push({
      ...action,
      explanation: await explainAction(action)
    });
  }
  return explained;
}

module.exports = {
  explainActions,
  fallbackExplanation
};
