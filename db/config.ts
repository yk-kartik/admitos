export type PersistenceMode = "DATABASE" | "MOCK";

export function resolvePersistenceMode(databaseUrl: string | undefined): PersistenceMode {
  return databaseUrl?.trim() ? "DATABASE" : "MOCK";
}

export function readDatabaseUrl(environment: Record<string, string | undefined>): string | null {
  const value = environment.DATABASE_URL?.trim();
  return value || null;
}
