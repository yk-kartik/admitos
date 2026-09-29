import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";
import { readDatabaseUrl } from "./config";

function createConnection(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 5,
    prepare: false,
  });
  return { client, database: drizzle(client, { schema }) };
}

type DatabaseConnection = ReturnType<typeof createConnection>;
export type AppDatabase = DatabaseConnection["database"];

type DatabaseCache = typeof globalThis & {
  __admitosDatabaseConnection?: DatabaseConnection;
};

const globalCache = globalThis as DatabaseCache;

export function getDatabaseUrl(): string | null {
  return readDatabaseUrl(process.env);
}

export function getDatabase(): AppDatabase | null {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!globalCache.__admitosDatabaseConnection) {
    globalCache.__admitosDatabaseConnection = createConnection(databaseUrl);
  }
  return globalCache.__admitosDatabaseConnection.database;
}

export async function closeDatabase(): Promise<void> {
  const connection = globalCache.__admitosDatabaseConnection;
  if (!connection) return;
  delete globalCache.__admitosDatabaseConnection;
  await connection.client.end({ timeout: 5 });
}

export type PostgresClient = Sql;
