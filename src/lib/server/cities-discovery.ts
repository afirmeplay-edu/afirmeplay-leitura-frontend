import { Pool } from "pg";
import { serverEnv } from "@/lib/env";

export interface DiscoveryCity {
  id: string;
  tenant_code: string;
  slug: string;
  name: string;
  hosting_mode: "shared" | "dedicated";
  api_base_url: string;
}

interface MobileCitiesResponse {
  cities?: DiscoveryCity[];
}

interface DbCityRow {
  id: string;
  name: string;
  slug: string;
}

const META_VPS_SLUG = "afirme";

async function fetchMobileCatalog(baseUrl: string): Promise<DiscoveryCity[]> {
  const response = await fetch(`${baseUrl}/mobile/v1/available-cities`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as MobileCitiesResponse;
  return data.cities ?? [];
}

async function fetchCitiesFromDatabase(connectionString: string): Promise<DiscoveryCity[]> {
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 8_000,
  });

  try {
    const result = await pool.query<DbCityRow>(
      `SELECT id, name, slug
       FROM public.city
       WHERE slug IS NOT NULL
         AND btrim(slug) <> ''
       ORDER BY name ASC`
    );

    return result.rows.map((row) => mapDbCityRow(row));
  } finally {
    await pool.end();
  }
}

function mapDbCityRow(row: DbCityRow): DiscoveryCity {
  return {
    id: row.id,
    tenant_code: row.slug.slice(0, 6).toUpperCase(),
    slug: row.slug.trim().toLowerCase(),
    name: row.name,
    hosting_mode: "shared",
    api_base_url: serverEnv.discoveryRemoteApi,
  };
}

async function fetchCitiesFromAuthenticatedApi(baseUrl: string): Promise<DiscoveryCity[]> {
  const registration = process.env.CITIES_DISCOVERY_REGISTRATION?.trim();
  const password = process.env.CITIES_DISCOVERY_PASSWORD?.trim();

  if (!registration || !password) {
    return [];
  }

  const loginResponse = await fetch(`${baseUrl}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ registration, password }),
    cache: "no-store",
  });

  if (!loginResponse.ok) {
    throw new Error(`Login discovery HTTP ${loginResponse.status} (${baseUrl})`);
  }

  const loginData = (await loginResponse.json()) as { token?: string };
  if (!loginData.token) {
    return [];
  }

  const citiesResponse = await fetch(`${baseUrl}/city/`, {
    headers: {
      Authorization: `Bearer ${loginData.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!citiesResponse.ok) {
    throw new Error(`City list HTTP ${citiesResponse.status} (${baseUrl})`);
  }

  const cities = (await citiesResponse.json()) as DbCityRow[];
  if (!Array.isArray(cities)) {
    return [];
  }

  return cities
    .filter((city) => city.slug?.trim())
    .map((city) => mapDbCityRow(city));
}

async function fetchCitiesFromVpsCentralApi(): Promise<DiscoveryCity[]> {
  return fetchCitiesFromAuthenticatedApi(serverEnv.discoveryRemoteApi);
}

async function fetchCitiesFromLocalBackendApi(): Promise<DiscoveryCity[]> {
  return fetchCitiesFromAuthenticatedApi(serverEnv.apiBaseUrl);
}

function mergeCitySources(dbCities: DiscoveryCity[], mobileCities: DiscoveryCity[]): DiscoveryCity[] {
  const bySlug = new Map<string, DiscoveryCity>();

  for (const city of dbCities) {
    bySlug.set(city.slug, city);
  }

  for (const city of mobileCities) {
    if (city.slug === META_VPS_SLUG) {
      continue;
    }
    bySlug.set(city.slug, city);
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function getCitiesDatabaseUrl() {
  const url = (
    process.env.CITIES_DATABASE_URL?.trim() ||
    process.env.DEST_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );

  if (!url) {
    return "";
  }

  try {
    const hostname = new URL(url.replace(/^postgresql:\/\//, "http://")).hostname;
    if (hostname === "host") {
      return "";
    }
  } catch {
    return "";
  }

  return url;
}

export async function discoverCities(): Promise<{ cities: DiscoveryCity[]; source: string }> {
  const mobileFromVps = await fetchMobileCatalog(serverEnv.discoveryRemoteApi);
  const databaseUrl = getCitiesDatabaseUrl();

  if (databaseUrl) {
    try {
      const dbCities = await fetchCitiesFromDatabase(databaseUrl);
      if (dbCities.length > 0) {
        return {
          cities: mergeCitySources(dbCities, mobileFromVps),
          source: "vps-central-db",
        };
      }
    } catch (error) {
      console.error("[discovery/cities] Falha ao consultar public.city:", error);
    }
  }

  try {
    const apiCities = await fetchCitiesFromVpsCentralApi();
    if (apiCities.length > 0) {
      return {
        cities: mergeCitySources(apiCities, mobileFromVps),
        source: "vps-central-api",
      };
    }
  } catch (error) {
    console.error("[discovery/cities] Falha ao consultar /city/ na VPS central:", error);
  }

  try {
    const localCities = await fetchCitiesFromLocalBackendApi();
    if (localCities.length > 0) {
      return {
        cities: mergeCitySources(localCities, mobileFromVps),
        source: "local-backend-api",
      };
    }
  } catch (error) {
    console.error("[discovery/cities] Falha ao consultar /city/ no backend local:", error);
  }

  const fallback = mobileFromVps.filter((city) => city.slug !== META_VPS_SLUG);
  return {
    cities: fallback,
    source: "vps-central-mobile",
  };
}
