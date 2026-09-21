import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __voxflowPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__voxflowPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__voxflowPrisma = prisma;
}

export * from "@prisma/client";
