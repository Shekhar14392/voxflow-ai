export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompletionRequest {
  messages: LlmMessage[];
  temperature?: number;
}

export interface LlmCompletionResult {
  content: string;
  provider: string;
  mocked: boolean;
}

export interface LlmProvider {
  name: string;
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;
}
