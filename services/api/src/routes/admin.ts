import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@voxflow/database";
import { requireAdminKey } from "../middleware/adminAuth";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAdminKey);

  app.get("/api/v1/admin/dashboard", async () => {
    const [organizations, agents, calls, leads, activeSubscriptions] = await Promise.all([
      prisma.organization.count(),
      prisma.agent.count(),
      prisma.call.count(),
      prisma.lead.count(),
      prisma.subscription.count({ where: { status: "active" } }),
    ]);

    const recentOrganizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, status: true, createdAt: true },
    });

    return {
      totals: { organizations, agents, calls, leads, activeSubscriptions },
      recentOrganizations,
    };
  });

  app.get("/api/v1/admin/organizations", async () => {
    return prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { agents: true, calls: true, leads: true, members: true } },
        plan: { select: { name: true } },
      },
    });
  });

  app.patch("/api/v1/admin/organizations/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]) }).parse(req.body);

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const updated = await prisma.organization.update({ where: { id }, data: { status: body.status } });

    await prisma.auditLog.create({
      data: {
        organizationId: id,
        action: "admin.organization.status_changed",
        targetType: "Organization",
        targetId: id,
        metadata: { newStatus: body.status },
      },
    });

    return updated;
  });

  app.get("/api/v1/admin/audit-logs", async () => {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });
}
