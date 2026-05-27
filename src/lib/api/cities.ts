import axios from "axios";

export interface AvailableCity {
  id: string;
  tenant_code: string;
  slug: string;
  name: string;
  hosting_mode: "shared" | "dedicated";
  api_base_url: string;
}

interface DiscoveryRouteResponse {
  cities: AvailableCity[];
  source?: string;
  error?: string;
}

export async function fetchAvailableCities() {
  const { data } = await axios.get<DiscoveryRouteResponse>("/api/discovery/cities");
  return data.cities ?? [];
}
