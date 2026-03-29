function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

export function getDatabaseUrl() {
  return getRequiredEnv("DATABASE_URL");
}

export function getNeonAuthBaseUrl() {
  return getRequiredEnv("NEON_AUTH_BASE_URL");
}

export function getNeonAuthCookieSecret() {
  return getRequiredEnv("NEON_AUTH_COOKIE_SECRET");
}
