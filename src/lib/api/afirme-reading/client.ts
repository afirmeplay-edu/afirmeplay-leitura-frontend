import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/api/client";
import { getCityContextHeaders } from "@/lib/city-domain";

const BASE_PATH = "/afirme-reading";

function withCityHeaders(config?: AxiosRequestConfig): AxiosRequestConfig {
  return {
    ...config,
    headers: {
      ...(config?.headers ?? {}),
      ...getCityContextHeaders(),
    },
  };
}

export const afirmeReadingApi = {
  get<T>(path: string, config?: AxiosRequestConfig) {
    return api.get<T>(`${BASE_PATH}${path}`, withCityHeaders(config));
  },
  post<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
    return api.post<T>(`${BASE_PATH}${path}`, data, withCityHeaders(config));
  },
  /** Multipart upload — Content-Type fica a cargo do interceptor (FormData). */
  postForm<T>(path: string, formData: FormData, config?: AxiosRequestConfig) {
    return api.post<T>(`${BASE_PATH}${path}`, formData, withCityHeaders(config));
  },
  patch<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
    return api.patch<T>(`${BASE_PATH}${path}`, data, withCityHeaders(config));
  },
  delete<T>(path: string, config?: AxiosRequestConfig) {
    return api.delete<T>(`${BASE_PATH}${path}`, withCityHeaders(config));
  },
};
