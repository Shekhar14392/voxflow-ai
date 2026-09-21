import { prisma } from "@voxflow/database";
import { getLlmProvider } from "./llm";

export interface AnswerResult {
  content: string;
  engine: "knowledge-retrieval" | "mock-llm";
  mocked: boolean;
}

/**
 * Zero-cost answer pipeline:
 * 1. If the agent has knowledge documents, search them with Postgres
 *    full-text search (free, built into Postgres, no embeddings API).
 * 2. If a good match is found, answer directly from that content
 *    (extractive, not generative — no LLM call needed at all).
 * 3. Otherwise fall back to the mock/real LLM provider.
 *
 * This lets a business get a genuinely working (if basic) support
 * agent with zero third-party accounts. Swap in a real LLM provider
 * later for generative, conversational answers.
 */
export async function answerFromAgent(agentId: string, organizationId: string, message: string): Promise<AnswerResult> {
  const results = await prisma.$queryRaw<{ id: string; content: string; rank: number }[]>`
    SELECT kc.id, kc.content,
           ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', ${message})) AS rank
    FROM "KnowledgeChunk" kc
    JOIN "KnowledgeDocument" kd ON kd.id = kc."knowledgeDocumentId"
    JOIN "KnowledgeBase" kb ON kb.id = kd."knowledgeBaseId"
    WHERE kb."organizationId" = ${organizationId}
      AND (kb."agentId" = ${agentId} OR kb."agentId" IS NULL)
      AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', ${message})
    ORDER BY rank DESC
    LIMIT 1
  `;

  const bestMatch = results[0];
  if (bestMatch && bestMatch.rank > 0) {
    return {
      content: bestMatch.content,
      engine: "knowledge-retrieval",
      mocked: false,
    };
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  const llm = getLlmProvider();
  const result = await llm.complete({
    messages: [
      { role: "system", content: agent?.systemInstructions ?? "You are a helpful assistant." },
      { role: "user", content: message },
    ],
    temperature: agent?.temperature,
  });

  return { content: result.content, engine: "mock-llm", mocked: result.mocked };
}
