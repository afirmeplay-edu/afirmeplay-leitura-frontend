export interface JwtPayload {
  sub?: string;
  city_id?: string | null;
  city_slug?: string | null;
  role?: string;
  exp?: number;
  plan_code?: string;
  [key: string]: unknown;
}

/** Decodifica o payload de um JWT (sem validar assinatura — só leitura no client). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAdminRole(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "admin";
}

/** Roles em que o município vem do JWT (não precisam escolher cidade nas telas). */
export function roleUsesJwtCity(role: string | null | undefined) {
  const normalized = (role ?? "").trim().toLowerCase();
  if (!normalized || normalized === "admin") return false;
  return true;
}
