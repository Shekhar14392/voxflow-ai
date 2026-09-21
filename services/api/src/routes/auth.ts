import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@voxflow/database";
import { hashPassword, verifyPassword, signTokens } from "../lib/auth";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(body.password);
    const slug = body.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: body.name, email: body.email, passwordHash },
      });

      const organization = await tx.organization.create({
        data: { name: body.organizationName, slug: `${slug}-${Date.now().toString(36)}` },
      });

      const ownerRole = await tx.role.create({
        data: { organizationId: organization.id, name: "OWNER", isSystemRole: false },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: "active",
          joinedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId: user.id,
          action: "organization.created",
          targetType: "Organization",
          targetId: organization.id,
        },
      });

      return { user, organization };
    });

    const tokens = signTokens(app, {
      userId: result.user.id,
      organizationId: result.organization.id,
    });

    return reply.code(201).send({
      user: { id: result.user.id, name: result.user.name, email: result.user.email },
      organization: { id: result.organization.id, name: result.organization.name },
      ...tokens,
    });
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, status: "active" },
    });

    const tokens = signTokens(app, {
      userId: user.id,
      organizationId: membership?.organizationId,
    });

    return reply.send({
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens,
    });
  });

  app.post("/api/v1/auth/refresh", async (req, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(req.body);
    try {
      const decoded = app.jwt.verify<{ userId: string; organizationId?: string }>(
        body.refreshToken
      );
      const tokens = signTokens(app, decoded);
      return reply.send(tokens);
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }
  });
}
