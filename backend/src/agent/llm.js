import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export function createChat(tools) {
  const client = getClient();

  const functionDeclarations = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }));

  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    tools: functionDeclarations.length > 0
      ? [{ functionDeclarations }]
      : undefined
  });

  const chat = model.startChat({
    history: []
  });

  return chat;
}

export async function sendMessage(chat, message) {
  const result = await chat.sendMessage(message);
  return result.response;
}

export async function sendFunctionResult(chat, functionName, response) {
  const result = await chat.sendMessage([{
    functionResponse: {
      name: functionName,
      response: { result: response }
    }
  }]);
  return result.response;
}

export function extractFunctionCall(response) {
  const candidate = response.candidates?.[0];
  if (!candidate) return null;

  for (const part of candidate.content?.parts || []) {
    if (part.functionCall) {
      return {
        name: part.functionCall.name,
        args: part.functionCall.args || {}
      };
    }
  }
  return null;
}

export function extractText(response) {
  const candidate = response.candidates?.[0];
  if (!candidate) return '';

  const parts = candidate.content?.parts || [];
  return parts
    .filter(p => p.text)
    .map(p => p.text)
    .join('');
}

export function getTokenCount(response) {
  return response.usageMetadata?.totalTokenCount || 0;
}
