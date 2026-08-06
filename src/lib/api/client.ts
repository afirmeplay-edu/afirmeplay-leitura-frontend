import axios from "axios";
import {
  getCityApiBaseUrl,
  getCityContextHeaders,
  getDiscoveryBaseUrl,
} from "@/lib/city-domain";

export const api = axios.create({
  baseURL: getDiscoveryBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Sempre envia contexto de cidade quando disponível:
    // - não-admin: preenchido a partir do JWT/user no login
    // - admin: preenchido pelo select de município nas telas tenant
    const cityHeaders = getCityContextHeaders();
    Object.assign(config.headers, cityHeaders);
  }

  // FormData precisa do boundary definido pelo browser/axios — remove JSON default.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    const headers = config.headers;
    if (headers && typeof headers.delete === "function") {
      headers.delete("Content-Type");
    } else if (headers) {
      delete (headers as Record<string, unknown>)["Content-Type"];
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export function createCityApi() {
  return axios.create({
    baseURL: getCityApiBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}
