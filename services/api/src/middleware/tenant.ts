import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@voxflow/database";

/**
 * Resolves the caller's organization from their authenticated
 * membership row — never from a client-supplied organizationId.
 * Attaches req.organizationId + req.userId for downstream handlers.
 */
export async function requireOrganization(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.user as { userId: string } | undefined)?.userId;
  if (!userId) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, status: "active" },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    return reply.code(403).send({ error: "No active organization membership" });
  }

  (req as any).organizationId = membership.organizationId;
  (req as any).userId = userId;
}
