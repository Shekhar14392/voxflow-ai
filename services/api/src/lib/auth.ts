import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signTokens(
  app: FastifyInstance,
  payload: { userId: string; organizationId?: string }
) {
  const accessToken = app.jwt.sign(payload, { expiresIn: process.env.JWT_ACCESS_TTL ?? "15m" });
  const refreshToken = app.jwt.sign(payload, { expiresIn: process.env.JWT_REFRESH_TTL ?? "30d" });
  return { accessToken, refreshToken };
}
