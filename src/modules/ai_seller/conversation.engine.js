const OpenAI = require("openai");
const prompt = require("./aiSeller.prompt");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateReply(context, messages) {
  const systemPrompt = prompt;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ],
    max_tokens: 160,
    temperature: 0.4
  });

  return response.choices[0].message.content;
}

module.exports = {
  generateReply
};
