import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@voxflow/database";
import { requireOrganization } from "../middleware/tenant";

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1),
  agentId: z.string().uuid().optional(),
});

const addDocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function knowledgeRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/v1/knowledge", { preHandler: requireOrganization }, async (req) => {
    const organizationId = (req as any).organizationId as string;
    return prisma.knowledgeBase.findMany({
      where: { organizationId },
      include: { documents: { select: { id: true, sourceType: true, status: true, createdAt: true } } },
    });
  });

  app.post("/api/v1/knowledge", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const body = createKnowledgeBaseSchema.parse(req.body);

    const kb = await prisma.knowledgeBase.create({
      data: { organizationId, name: body.name, agentId: body.agentId, status: "READY" },
    });
    return reply.code(201).send(kb);
  });

  // Free-tier ingestion: accepts pasted text directly (no PDF/URL extraction
  // service needed). Chunks by paragraph and stores as plain text — search
  // happens via Postgres full-text search, not paid embeddings.
  app.post(
    "/api/v1/knowledge/:id/documents",
    { preHandler: requireOrganization },
    async (req, reply) => {
      const organizationId = (req as any).organizationId as string;
      const { id } = req.params as { id: string };
      const body = addDocumentSchema.parse(req.body);

      const kb = await prisma.knowledgeBase.findFirst({ where: { id, organizationId } });
      if (!kb) return reply.code(404).send({ error: "Knowledge base not found" });

      const document = await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: kb.id,
          sourceType: "text",
          rawTextRef: body.title,
          status: "READY",
        },
      });

      const paragraphs = body.content
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      for (const content of paragraphs) {
        await prisma.knowledgeChunk.create({
          data: { knowledgeDocumentId: document.id, content },
        });
      }

      return reply.code(201).send({ document, chunksCreated: paragraphs.length });
    }
  );

  // Free semantic-ish search using Postgres's built-in full-text search
  // (to_tsvector / plainto_tsquery) — ranked, no external API, no cost.
  app.post("/api/v1/knowledge/search", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const body = z.object({ query: z.string().min(1), limit: z.number().max(20).default(5) }).parse(
      req.body
    );

    const results = await prisma.$queryRaw<
      { id: string; content: string; rank: number }[]
    >`
      SELECT kc.id, kc.content,
             ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', ${body.query})) AS rank
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeDocument" kd ON kd.id = kc."knowledgeDocumentId"
      JOIN "KnowledgeBase" kb ON kb.id = kd."knowledgeBaseId"
      WHERE kb."organizationId" = ${organizationId}
        AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', ${body.query})
      ORDER BY rank DESC
      LIMIT ${body.limit}
    `;

    return reply.send({ results, engine: "postgres-fulltext-free" });
  });
}
