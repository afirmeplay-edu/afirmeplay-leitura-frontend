import axios from "axios";

export interface AvailableCity {
  id: string;
  name: string;
  slug: string;
  state: string;
  plan_code: string;
}

interface AfirmeReadingCitiesResponse {
  api_contract_version?: string;
  source?: string;
  feature?: string;
  generated_at?: string;
  cities: AvailableCity[];
  error?: string;
}

/** Lista municípios com a feature afirme_reading (GET público, sem JWT). */
export async function fetchAvailableCities() {
  const { data } = await axios.get<AfirmeReadingCitiesResponse>(
    "/api/afirme-reading/discovery/cities"
  );
  return Array.isArray(data.cities) ? data.cities : [];
}
