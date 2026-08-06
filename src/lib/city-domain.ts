const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, "");

const CITY_ID_KEY = "selected_city_id";
const CITY_SLUG_KEY = "selected_slug";

export function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

/** Município selecionado no app (mesmo domínio — sem subdomínio). */
export function getSelectedCitySlug(): string | null {
  if (typeof window === "undefined") return null;
  const slug = localStorage.getItem(CITY_SLUG_KEY);
  return slug ? normalizeSlug(slug) : null;
}

export function getSelectedCityId(): string | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(CITY_ID_KEY);
  return id?.trim() || null;
}

export function setSelectedCitySlug(slug: string | null) {
  if (typeof window === "undefined") return;
  if (slug) localStorage.setItem(CITY_SLUG_KEY, normalizeSlug(slug));
  else localStorage.removeItem(CITY_SLUG_KEY);
}

export function setSelectedCityId(cityId: string | null) {
  if (typeof window === "undefined") return;
  if (cityId) localStorage.setItem(CITY_ID_KEY, cityId.trim());
  else localStorage.removeItem(CITY_ID_KEY);
}

/** Define contexto de município usado pelos interceptors (X-City-ID / X-City-Slug). */
export function setCityContext(options: { cityId?: string | null; slug?: string | null }) {
  if (options.cityId !== undefined) setSelectedCityId(options.cityId);
  if (options.slug !== undefined) setSelectedCitySlug(options.slug);
}

export function clearCityContext() {
  setSelectedCityId(null);
  setSelectedCitySlug(null);
}

export function getCityContextHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const cityId = getSelectedCityId();
  const slug = getSelectedCitySlug();
  if (cityId) headers["X-City-ID"] = cityId;
  if (slug) headers["X-City-Slug"] = slug;
  return headers;
}

export function getCityApiBaseUrl() {
  if (typeof window !== "undefined") {
    return "/api";
  }
  return API_BASE_URL;
}

export function getDiscoveryBaseUrl() {
  if (typeof window !== "undefined") {
    return "/api";
  }
  return API_BASE_URL;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
