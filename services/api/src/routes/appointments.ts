import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@voxflow/database";
import { requireOrganization } from "../middleware/tenant";

const createAppointmentSchema = z.object({
  service: z.string().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().default(30),
  contactId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function appointmentRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/v1/appointments", { preHandler: requireOrganization }, async (req) => {
    const organizationId = (req as any).organizationId as string;
    return prisma.appointment.findMany({ where: { organizationId }, orderBy: { scheduledAt: "asc" } });
  });

  app.post("/api/v1/appointments", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const body = createAppointmentSchema.parse(req.body);

    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        service: body.service,
        scheduledAt: new Date(body.scheduledAt),
        durationMinutes: body.durationMinutes,
        contactId: body.contactId,
        notes: body.notes,
        status: "PENDING",
      },
    });
    return reply.code(201).send(appointment);
  });

  app.patch("/api/v1/appointments/:id", { preHandler: requireOrganization }, async (req, reply) => {
    const organizationId = (req as any).organizationId as string;
    const { id } = req.params as { id: string };
    const body = z
      .object({ status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]) })
      .parse(req.body);

    const existing = await prisma.appointment.findFirst({ where: { id, organizationId } });
    if (!existing) return reply.code(404).send({ error: "Appointment not found" });

    return prisma.appointment.update({ where: { id }, data: body });
  });
}
