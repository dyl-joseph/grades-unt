const ENV_PREFIX_PATTERN = /^(DATABASE_URL|DIRECT_URL)=/;

export function normalizePostgresConnectionString(connectionString: string) {
  const sanitized = connectionString.trim().replace(ENV_PREFIX_PATTERN, "");
  const connectionUrl = new URL(sanitized);
  connectionUrl.searchParams.delete("sslmode");
  return connectionUrl.toString();
}
