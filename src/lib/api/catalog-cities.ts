import { api } from "@/lib/api/client";

export interface CatalogCity {
  id: string;
  name: string;
  state: string | null;
  created_at?: string | null;
}

function unwrapCities(data: unknown): CatalogCity[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)
      ? ((data as { data: unknown[] }).data)
      : data && typeof data === "object" && Array.isArray((data as { cities?: unknown }).cities)
        ? ((data as { cities: unknown[] }).cities)
        : [];

  return list.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id),
      name: String(row.name ?? "Municipio"),
      state: typeof row.state === "string" ? row.state : null,
      created_at: typeof row.created_at === "string" ? row.created_at : null,
    };
  });
}

/** Lista municípios do catálogo (GET /city) — usado pelo admin para escolher contexto. */
export async function listCatalogCities() {
  try {
    const { data } = await api.get("/city");
    return unwrapCities(data);
  } catch {
    const { data } = await api.get("/city/");
    return unwrapCities(data);
  }
}
