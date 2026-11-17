function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/** Variaveis usadas apenas no servidor (route handlers, etc.). */
export const serverEnv = {
  apiBaseUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"),
  appEnv: process.env.APP_ENV ?? "development",
  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === "true",
} as const;
