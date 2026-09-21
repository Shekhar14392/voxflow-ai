import { FastifyInstance } from "fastify";
import { prisma } from "@voxflow/database";
import { requireOrganization } from "../middleware/tenant";

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/v1/organizations/current", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { plan: true },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });
    return org;
  });
}
