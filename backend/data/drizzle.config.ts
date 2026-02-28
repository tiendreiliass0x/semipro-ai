import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './data/drizzle-schema.ts',
  out: './data/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://yenengalabs:yenengalabs@localhost:5432/yenengalabs',
  },
});
