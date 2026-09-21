import { LlmProvider } from "./types";
import { mockLlmProvider } from "./mockProvider";

export function getLlmProvider(): LlmProvider {
  const useMock = process.env.USE_MOCK_PROVIDERS === "true" || !process.env.OPENAI_API_KEY;

  if (useMock) {
    return mockLlmProvider;
  }

  // Real providers (OpenAI/Gemini/Anthropic) plug in here.
  // Kept mock-only in this scaffold so it runs without any API keys;
  // implement OpenAiProvider / GeminiProvider / AnthropicProvider next
  // and select between them based on process.env.LLM_PROVIDER.
  return mockLlmProvider;
}

export * from "./types";
