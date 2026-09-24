import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIOptions, FinanceItem, CardExpense, LoanEntry, EmiPayment } from "../types";
import { checkVeloAILimit, incrementVeloAIUsage } from "./storage";
import { getVeloKey, getVeloModel } from "./veloCredentials";
import { AI_TOOLS_SCHEMA } from "./ai-tools";
import { AppLanguage, getAILanguageDetectionPrompt, getAIResponseLanguagePrompt } from "./i18n";
import { getModelsToTry, markModelFailed } from "./freeModelRotator";

export interface AIResponse {
  success: boolean;
  text?: string;
  data?: any;
  error?: string;
}

export const OPENROUTER_MODELS = [
  { id: "google/gemini-flash-1.5", name: "Gemini 1.5 Flash (Fast & Cheap)" },
  { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro (Powerful)" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "openai/gpt-4o", name: "GPT-4o (Powerful)" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "meta-llama/llama-3-8b-instruct", name: "Llama 3 8B (Free)" },
];

export const GROQ_MODELS = [
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Fast)" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
];

async function callOpenRouter(key: string, model: string, systemPrompt: string, inputMessages: {role: string, content: string}[], imageBase64?: string): Promise<string> {
  const safeKey = key.trim();
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...inputMessages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))
  ];

  if (imageBase64) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "user") {
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
    }
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${safeKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin, // Optional, for OpenRouter rankings
      "X-Title": "Finance-Vault", // Optional
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMsg = errorData.error?.message || `OpenRouter error: ${response.status}`;
    if (errMsg.includes("must be a string")) {
      throw new Error("The selected AI model does not support Image Scanning. Please select a Vision-capable model in Settings.");
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGroq(key: string, model: string, systemPrompt: string, inputMessages: {role: string, content: string}[], imageBase64?: string): Promise<string> {
  const safeKey = key.trim();
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...inputMessages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))
  ];

  if (imageBase64) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "user") {
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
    }
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${safeKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMsg = errorData.error?.message || `Groq error: ${response.status}`;
    if (errMsg.includes("must be a string")) {
      throw new Error("The selected AI model does not support Image Scanning. Please select a Vision-capable model in Settings.");
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(key: string, systemPrompt: string, inputMessages: {role: string, content: string}[], imageBase64?: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt 
  });

  const contents = inputMessages.map(m => ({
    role: m.role === "ai" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (match) {
      const lastMsg = contents[contents.length - 1];
      if (lastMsg.role === "user") {
        lastMsg.parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        } as any);
      }
    }
  }

  const result = await model.generateContent({ contents });
  const response = await result.response;
  return response.text();
}

async function callVeloAI(systemPrompt: string, inputMessages: {role: string, content: string}[], imageBase64?: string): Promise<string> {
  if (!checkVeloAILimit()) {
    throw new Error("VeloAI Daily Limit Reached (10/10). Please try again tomorrow or select a different AI provider in Settings.");
  }
  const k = getVeloKey();
  const defaultModel = getVeloModel();

  // 1. Try the default hardcoded model first
  try {
    console.log("[VeloAI] Trying default model:", defaultModel);
    const res = await callOpenRouter(k, defaultModel, systemPrompt, inputMessages, imageBase64);
    incrementVeloAIUsage();
    return res;
  } catch (defaultErr: any) {
    console.warn("[VeloAI] Default model failed:", defaultModel, defaultErr.message);
    markModelFailed(defaultModel);
  }

  // 2. Auto-rotate through free models from OpenRouter
  const freeModels = await getModelsToTry();
  if (freeModels.length === 0) {
    throw new Error("VeloAI: Default model failed and no free fallback models are available. Please check your connection or try again later.");
  }

  const errors: string[] = [];
  for (const fm of freeModels) {
    // Skip the default model since we already tried it
    if (fm.id === defaultModel) continue;

    try {
      console.log("[VeloAI] Trying free model:", fm.id, fm.name);
      const res = await callOpenRouter(k, fm.id, systemPrompt, inputMessages, imageBase64);
      console.log("[VeloAI] ✓ Success with:", fm.id);
      incrementVeloAIUsage();
      return res;
    } catch (err: any) {
      console.warn("[VeloAI] ✗ Failed:", fm.id, err.message);
      markModelFailed(fm.id);
      errors.push(`${fm.id}: ${err.message}`);
    }
  }

  // 3. All models exhausted
  throw new Error(
    `VeloAI: All free models failed. Tried ${errors.length + 1} models. Last error: ${errors[errors.length - 1] || "Unknown"}`
  );
}

async function callAI(opts: AIOptions, systemPrompt: string, messages: {role: string, content: string}[], imageBase64?: string): Promise<string> {
  if (opts.provider === "gemini") {
    if (!opts.geminiKey) throw new Error("Gemini API key is not configured.");
    return await callGemini(opts.geminiKey, systemPrompt, messages, imageBase64);
  } else if (opts.provider === "openrouter") {
    if (!opts.openRouterKey) throw new Error("OpenRouter API key is not configured.");
    return await callOpenRouter(opts.openRouterKey, opts.openRouterModel, systemPrompt, messages, imageBase64);
  } else if (opts.provider === "groq") {
    if (!opts.groqKey) throw new Error("Groq API key is not configured.");
    return await callGroq(opts.groqKey, opts.groqModel, systemPrompt, messages, imageBase64);
  } else if (opts.provider === "veloai") {
    return await callVeloAI(systemPrompt, messages, imageBase64);
  }
  throw new Error("AI provider is not configured.");
}

export async function askVault(
  opts: AIOptions, 
  messages: { role: string, content: string }[], 
  context: { 
    items: FinanceItem[], 
    expenses: CardExpense[],
    loans?: LoanEntry[],
    emiPayments?: EmiPayment[]
  }, 
  lang: AppLanguage = "en"
): Promise<AIResponse> {
  try {
    const systemPrompt = `You are an Agentic Financial AI Assistant built into the "Finance-Vault" app. You are known as "FinAura Assistant".
You are given the user's current financial context in JSON format, and a list of TOOLS you can use to perform actions.

When the user asks general questions, answer them naturally and concisely.
When the user asks to perform an ACTION (like adding an expense, deleting a transaction, creating an account), you MUST use a tool.

LOANS & EMIS AWARENESS:
You have complete visibility into the user's Loans and Credit Card EMIs in \`context.loans\` and \`context.emiPayments\`.
You can answer any questions regarding:
- Active loans (personal, home, auto, etc.) and Credit Card EMIs.
- Total principal, total payable amount including interest and taxes, and remaining balances.
- Monthly EMI amounts, next payment due dates, and paid vs unpaid EMI counts.
- Interest rates, lender names, and loan tenure.
Always provide clear, accurate, and encouraging financial summaries when asked about loans or EMIs.

To use a tool, you MUST output ONLY a JSON block wrapped in \`\`\`json containing "tool_call" and "arguments". Do NOT output any other text when calling a tool.
Example Tool Call Output:
\`\`\`json
{
  "tool_call": "add_card_expense",
  "arguments": {
    "cardId": "123",
    "description": "Starbucks",
    "amount": 5.50,
    "date": "${new Date().toISOString().split("T")[0]}"
  }
}
\`\`\`

If a destructive action is requested (e.g., delete), you MUST ask the user for confirmation first BEFORE outputting the tool call.

AVAILABLE TOOLS SCHEMA:
${JSON.stringify(AI_TOOLS_SCHEMA, null, 2)}

${getAILanguageDetectionPrompt()}

${getAIResponseLanguagePrompt(lang)}

Important facts you MUST adhere to if asked:
1. FinAura is owned by: VeloLaunch - A Division of Smart Vista IT Solutions
2. The parent company of FinAura or VeloLaunch is: Smart Vista IT Solutions
3. The Founder / Developer / CEO of VeloLaunch and Smart Vista IT Solutions is: Syed Abdul Talib

Current Date: ${new Date().toLocaleDateString()}

Context:
${JSON.stringify(context, null, 2)}`;

    const text = await callAI(opts, systemPrompt, messages);
    
    // Check if the output is a tool call
    if (text.includes('```json') && text.includes('"tool_call"')) {
      const cleanJson = text.split('```json')[1].split('```')[0].trim();
      try {
        const parsed = JSON.parse(cleanJson);
        if (parsed.tool_call) {
          return { success: true, data: { type: "tool_call", ...parsed }, text };
        }
      } catch(e) {}
    }
    
    return { success: true, text };
  } catch (err: any) {
    let msg = err.message || "Failed to contact AI.";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg += " (Make sure you have an active internet connection and that no adblockers/privacy extensions are blocking the API request.)";
    }
    return { success: false, error: msg };
  }
}

export async function parseNaturalExpense(opts: AIOptions, text: string, cards: FinanceItem[]): Promise<AIResponse> {
  try {
    const systemPrompt = `You are an AI that extracts expense details from natural language text.
You MUST respond with ONLY a valid JSON object, without any markdown formatting like \`\`\`json.
The JSON object must have the following fields:
- description: string (the merchant or item name)
- amount: number (the numeric amount)
- date: string (YYYY-MM-DD format, guess based on today if ambiguous. Today is ${new Date().toISOString().split("T")[0]})
- cardId: string (match the card name from the context to the best matching card ID. If none match, return an empty string)

${getAILanguageDetectionPrompt()}

Context (Available Cards):
${JSON.stringify(cards.map(c => ({ id: c.id, name: c.name })), null, 2)}`;

    const resultText = await callAI(opts, systemPrompt, [{ role: "user", content: text }]);
    // Strip markdown formatting if the model still outputs it
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    return { success: true, data };
  } catch (err: any) {
    let msg = err.message || "Failed to parse expense.";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg += " (Make sure you have an active internet connection and that no adblockers/privacy extensions are blocking the API request.)";
    }
    return { success: false, error: msg };
  }
}

export async function scanReceipt(opts: AIOptions, base64Image: string, cards: FinanceItem[]): Promise<AIResponse> {
  try {
    const systemPrompt = `You are an AI that extracts receipt/invoice details from images.
You MUST respond with ONLY a valid JSON object, without any markdown formatting like \`\`\`json.
Extract the following fields from the image:
- description: string (the main merchant or store name)
- amount: number (the final total amount paid)
- date: string (YYYY-MM-DD format. If not found, use today: ${new Date().toISOString().split("T")[0]})
- cashback: number (any discount or cashback mentioned, default 0)

${getAILanguageDetectionPrompt()}
The receipt may be in ANY language or contain mixed-language text. Extract data accurately regardless of the language or script on the receipt.

Respond ONLY with the JSON object.`;

    const resultText = await callAI(opts, systemPrompt, [{ role: "user", content: "Extract receipt details from this image." }], base64Image);
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    return { success: true, data };
  } catch (err: any) {
    let msg = err.message || "Failed to scan receipt.";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg += " (Make sure you have an active internet connection and that no adblockers/privacy extensions are blocking the API request.)";
    }
    return { success: false, error: msg };
  }
}
