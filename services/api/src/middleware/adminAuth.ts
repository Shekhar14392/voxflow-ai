import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Platform admin access uses a separate shared secret (ADMIN_API_KEY),
 * not a tenant JWT — the Super Admin isn't a member of any one
 * organization, they oversee all of them. Rotate this key in Render's
 * environment variables; never commit a real value to git.
 */
export async function requireAdminKey(req: FastifyRequest, reply: FastifyReply) {
  const provided = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return reply.code(500).send({ error: "ADMIN_API_KEY not configured on the server" });
  }
  if (provided !== expected) {
    return reply.code(401).send({ error: "Invalid admin key" });
  }
}
