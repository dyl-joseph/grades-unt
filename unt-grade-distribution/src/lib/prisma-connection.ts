export function normalizePostgresConnectionString(connectionString: string) {
  const connectionUrl = new URL(connectionString);
  connectionUrl.searchParams.delete("sslmode");
  return connectionUrl.toString();
}
