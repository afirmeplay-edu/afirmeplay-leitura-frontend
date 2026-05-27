const APP_BASE_DOMAIN = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ?? "localhost:3000";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export function getProtocol() {
  if (typeof window !== "undefined") {
    return window.location.protocol;
  }
  return "http:";
}

export function getHostForSlug(slug: string) {
  const safeSlug = normalizeSlug(slug);
  return `${safeSlug}.${APP_BASE_DOMAIN}`;
}

export function getHostnameSlug(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname;

  if (hostname.endsWith(".localhost")) {
    const slug = hostname.split(".")[0];
    return slug ? normalizeSlug(slug) : null;
  }

  if (hostname.endsWith(".afirmeplay.com.br")) {
    const parts = hostname.split(".");
    if (parts.length > 3) {
      return normalizeSlug(parts[0]);
    }
  }

  if (hostname.endsWith(".afirmeplay.com") && !hostname.endsWith(".afirmeplay.com.br")) {
    const parts = hostname.split(".");
    if (parts.length === 3) {
      return normalizeSlug(parts[0]);
    }
  }

  return null;
}

export function isOnSlugHost(slug: string) {
  const currentSlug = getHostnameSlug();
  return currentSlug === normalizeSlug(slug);
}

export function buildLoginUrlForSlug(slug: string) {
  const protocol = getProtocol();
  return `${protocol}//${getHostForSlug(slug)}/login`;
}

export function redirectToSlugLogin(slug: string) {
  if (typeof window === "undefined" || isOnSlugHost(slug)) {
    return;
  }

  localStorage.setItem("selected_slug", normalizeSlug(slug));
  window.location.href = buildLoginUrlForSlug(slug);
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
