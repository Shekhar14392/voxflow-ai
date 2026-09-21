import { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "./types";

/**
 * Deterministic canned-response provider. Lets the whole platform
 * (agent builder, test console, RAG wiring) run end-to-end with
 * zero real API keys during development and CI.
 */
export const mockLlmProvider: LlmProvider = {
  name: "mock",
  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const lastUserMessage = [...req.messages].reverse().find((m) => m.role === "user");
    const userText = lastUserMessage?.content ?? "";

    const content = userText
      ? `[mock agent response] I understood: "${userText}". This is a placeholder reply from the mock LLM provider — swap USE_MOCK_PROVIDERS=false and set a real API key to get real answers.`
      : "[mock agent response] Hello! How can I help you today?";

    return {
      content,
      provider: "mock",
      mocked: true,
    };
  },
};
