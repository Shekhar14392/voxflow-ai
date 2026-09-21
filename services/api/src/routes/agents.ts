import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@voxflow/database";
import { requireOrganization } from "../middleware/tenant";
import { answerFromAgent } from "../providers/answerEngine";

const createAgentSchema = z.object({
  name: z.string().min(1),
  businessName: z.string().optional(),
  industry: z.string().optional(),
  systemInstructions: z.string().min(1),
  greeting: z.string().optional(),
  language: z.string().default("en"),
});

const testAgentSchema = z.object({
  message: z.string().min(1),
});

export async function agentRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/v1/agents", { preHandler: requireOrganization }, async (req) => {
    const organizationId = (req as any).organizationId as string;
    return prisma.agent.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  });

  app.post("/api/v1/agents", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const body = createAgentSchema.parse(req.body);

    const agent = await prisma.agent.create({
      data: {
        organizationId,
        name: body.name,
        businessName: body.businessName,
        industry: body.industry,
        systemInstructions: body.systemInstructions,
        greeting: body.greeting,
        language: body.language,
        state: "DRAFT",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: (req as any).userId,
        action: "agent.created",
        targetType: "Agent",
        targetId: agent.id,
      },
    });

    return reply.code(201).send(agent);
  });

  app.get("/api/v1/agents/:id", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const { id } = req.params as { id: string };

    const agent = await prisma.agent.findFirst({ where: { id, organizationId } });
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    return agent;
  });

  app.patch("/api/v1/agents/:id", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const { id } = req.params as { id: string };
    const body = createAgentSchema.partial().parse(req.body);

    const existing = await prisma.agent.findFirst({ where: { id, organizationId } });
    if (!existing) return reply.code(404).send({ error: "Agent not found" });

    const updated = await prisma.agent.update({ where: { id }, data: body });
    return updated;
  });

  app.post("/api/v1/agents/:id/publish", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const { id } = req.params as { id: string };

    const existing = await prisma.agent.findFirst({ where: { id, organizationId } });
    if (!existing) return reply.code(404).send({ error: "Agent not found" });

    const updated = await prisma.agent.update({ where: { id }, data: { state: "ACTIVE" } });
    return updated;
  });

  // Text-mode test console — works today via the mock LLM provider,
  // no telephony or real API keys required.
  app.post("/api/v1/agents/:id/test", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const { id } = req.params as { id: string };
    const body = testAgentSchema.parse(req.body);

    const agent = await prisma.agent.findFirst({ where: { id, organizationId } });
    if (!agent) return reply.code(404).send({ error: "Agent not found" });

    const result = await answerFromAgent(agent.id, organizationId, body.message);
    return reply.send(result);
  });
}
