import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Prisma 7 reads connection details from here rather than from schema.prisma.
// Migrations use DIRECT_URL (port 5432) because the pgbouncer pooler on 6543
// cannot run the DDL and advisory locks that `prisma migrate` needs.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
})
