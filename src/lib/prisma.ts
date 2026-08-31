import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// Next.js dev-mode hot reload re-evaluates modules, which would otherwise open a
// new pool on every save until Postgres refuses connections. Cache on globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  // Prisma 7 has no Rust query engine — it talks to Postgres through a driver
  // adapter. DATABASE_URL is the pgbouncer pooler, which is what serverless
  // request handlers should use; migrations use DIRECT_URL via prisma.config.ts.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
