import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@voxflow/database";
import { requireOrganization } from "../middleware/tenant";

const createLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  agentId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "BOOKED", "CONVERTED", "LOST"]).optional(),
  notes: z.string().optional(),
  score: z.number().optional(),
});

export async function leadRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/v1/leads", { preHandler: requireOrganization }, async (req) => {
    const organizationId = (req as any).organizationId as string;
    return prisma.lead.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  });

  app.post("/api/v1/leads", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const body = createLeadSchema.parse(req.body);
    const lead = await prisma.lead.create({ data: { organizationId, ...body, status: "NEW" } });
    return reply.code(201).send(lead);
  });

  app.patch("/api/v1/leads/:id", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const { id } = req.params as { id: string };
    const body = updateLeadSchema.parse(req.body);

    const existing = await prisma.lead.findFirst({ where: { id, organizationId } });
    if (!existing) return reply.code(404).send({ error: "Lead not found" });

    return prisma.lead.update({ where: { id }, data: body });
  });
}
