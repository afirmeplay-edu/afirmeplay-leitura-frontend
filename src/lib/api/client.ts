import axios from "axios";
import { getCityApiBaseUrl, getDiscoveryBaseUrl } from "@/lib/city-domain";

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
