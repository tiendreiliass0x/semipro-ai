import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './drizzle-schema';

export const createDatabase = (url: string) => {
  const client = postgres(url);
  return drizzle(client, { schema });
};

export type Database = ReturnType<typeof createDatabase>;
