function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/** Variaveis usadas apenas no servidor (route handlers, etc.). */
export const serverEnv = {
  apiBaseUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"),
  discoveryRemoteApi: trimTrailingSlash(
    process.env.API_DISCOVERY_REMOTE_URL ?? "https://prod-api.afirmeplay.com.br"
  ),
  citiesDatabaseUrl: (
    process.env.CITIES_DATABASE_URL ??
    process.env.DEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    ""
  ).trim(),
  appEnv: process.env.APP_ENV ?? "development",
  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === "true",
  mockAuth: process.env.MOCK_AUTH === "true",
} as const;
