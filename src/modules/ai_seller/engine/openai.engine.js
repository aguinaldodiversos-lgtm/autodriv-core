const OpenAI = require("openai");
const buildPrompt = require("../aiSeller.prompt");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateReply(context, messages) {
  const systemPrompt = buildPrompt(context);

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ],
    temperature: 0.6,
    max_tokens: 200
  });

  return response.choices[0].message.content;
}

module.exports = {
  generateReply
};
