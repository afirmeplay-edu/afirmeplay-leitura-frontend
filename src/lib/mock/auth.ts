import type { User } from "@/stores/auth-store";

export const MOCK_AUTH_TOKEN = "mock-dev-token";

export function createMockUser(registration: string, slug?: string): User {
  const username = registration.split("@")[0] || "usuario";
  return {
    id: "usr-mock-dev",
    name: `Usuario ${username}`,
    email: registration.includes("@") ? registration : `${username}@afirmeplay.com.br`,
    registration: username,
    role: "admin",
    tenant_id: "tenant-mock-dev",
    city_slug: slug ?? null,
  };
}

export function isMockAuthToken(token: string | null | undefined) {
  return token === MOCK_AUTH_TOKEN;
}
