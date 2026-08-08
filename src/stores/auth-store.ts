"use client";

import { create } from "zustand";
import axios from "axios";
import { createCityApi } from "@/lib/api/client";
import { decodeJwtPayload, isJwtExpired, roleUsesJwtCity } from "@/lib/auth/jwt";
import {
  clearCityContext,
  getSelectedCityId,
  getSelectedCitySlug,
  setCityContext,
} from "@/lib/city-domain";

export interface UserEntitlements {
  plan_code?: string;
  features?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  registration: string;
  role: string;
  tenant_id: string | null;
  city_slug?: string | null;
  city_id?: string | null;
  plan_code?: string | null;
  entitlements?: UserEntitlements | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  selectedSlug: string | null;
  selectedCityId: string | null;
  loading: boolean;
  initialized: boolean;
  login: (slug: string | null, registration: string, password: string) => Promise<void>;
  persistUser: () => Promise<boolean>;
  hydrate: () => void;
  setAdminCityId: (cityId: string) => void;
  setAdminCityContext: (options: { cityId: string; slug?: string | null }) => void;
  logout: () => void;
}

function parseStorage<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function enrichUserFromToken(user: User, token: string): User {
  const payload = decodeJwtPayload(token);
  return {
    ...user,
    role: user.role || payload?.role || "",
    city_id:
      user.city_id ||
      (typeof payload?.city_id === "string" ? payload.city_id : null) ||
      null,
    city_slug:
      user.city_slug ||
      (typeof payload?.city_slug === "string" ? payload.city_slug : null) ||
      null,
    plan_code: user.plan_code || payload?.plan_code || null,
  };
}

/**
 * Sincroniza contexto local com JWT/user.
 * Não-admin: município vem do token/user.
 * Admin: mantém escolha manual (se houver).
 */
function syncCityContext(options: {
  token: string;
  user: User;
  loginSlug?: string | null;
}) {
  const { token, user, loginSlug } = options;
  const payload = decodeJwtPayload(token);
  const role = user.role || payload?.role || "";

  const cityId =
    user.city_id ||
    (typeof payload?.city_id === "string" ? payload.city_id : null) ||
    null;
  const citySlug =
    user.city_slug ||
    (typeof payload?.city_slug === "string" ? payload.city_slug : null) ||
    loginSlug ||
    null;

  if (roleUsesJwtCity(role)) {
    setCityContext({
      cityId: cityId,
      slug: citySlug,
    });
    return {
      selectedCityId: cityId,
      selectedSlug: citySlug,
    };
  }

  // Admin: município de rotas tenant só após escolha explícita no picker.
  // Não herda city_id do JWT/user — isso dispararia filtros tenant cedo demais.
  if (loginSlug) {
    setCityContext({ slug: loginSlug });
  }

  return {
    selectedCityId: getSelectedCityId(),
    selectedSlug: getSelectedCitySlug() || (loginSlug ? loginSlug : null),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  selectedSlug: null,
  selectedCityId: null,
  loading: false,
  initialized: false,

  hydrate: () => {
    const token = localStorage.getItem("token");
    const user = parseStorage<User>(localStorage.getItem("user"));

    if (token && user) {
      const enriched = enrichUserFromToken(user, token);
      const ctx = syncCityContext({ token, user: enriched });
      set({
        token,
        user: enriched,
        selectedSlug: ctx.selectedSlug,
        selectedCityId: ctx.selectedCityId,
        initialized: true,
      });
      return;
    }

    set({
      token,
      user,
      selectedSlug: getSelectedCitySlug(),
      selectedCityId: getSelectedCityId(),
      initialized: true,
    });
  },

  login: async (slug, registration, password) => {
    set({ loading: true });
    try {
      const cityApi = createCityApi();
      const normalizedSlug = slug?.trim() ? slug.trim().toLowerCase() : null;

      const body: {
        registration: string;
        password: string;
        citySlug?: string;
      } = {
        registration,
        password,
      };
      if (normalizedSlug) {
        body.citySlug = normalizedSlug;
      }

      const { data } = await cityApi.post("/login/", body, {
        headers: normalizedSlug ? { "X-City-Slug": normalizedSlug } : undefined,
      });

      const token = data?.token as string;
      const user = data?.user as User;
      if (!token || !user?.id) {
        throw new Error("Resposta de login inválida.");
      }

      const enrichedUser = enrichUserFromToken(user, token);
      const ctx = syncCityContext({
        token,
        user: enrichedUser,
        loginSlug: normalizedSlug || enrichedUser.city_slug,
      });

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(enrichedUser));

      set({
        token,
        user: enrichedUser,
        selectedSlug: ctx.selectedSlug,
        selectedCityId: ctx.selectedCityId,
      });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  persistUser: async () => {
    const token = get().token ?? localStorage.getItem("token");
    if (!token) return false;

    if (isJwtExpired(token)) {
      get().logout();
      return false;
    }

    const user = get().user ?? parseStorage<User>(localStorage.getItem("user"));
    const slug = get().selectedSlug ?? getSelectedCitySlug() ?? user?.city_slug;
    const cityId = get().selectedCityId ?? getSelectedCityId() ?? user?.city_id;

    try {
      const cityApi = createCityApi();
      cityApi.defaults.headers.common.Authorization = `Bearer ${token}`;
      if (slug) cityApi.defaults.headers.common["X-City-Slug"] = slug;
      if (cityId) cityApi.defaults.headers.common["X-City-ID"] = cityId;

      const { data } = await cityApi.get("/persist-user/");
      const persistedUser = enrichUserFromToken((data?.user ?? data) as User, token);
      if (!persistedUser?.id) {
        get().logout();
        return false;
      }

      const ctx = syncCityContext({
        token,
        user: persistedUser,
        loginSlug: slug,
      });

      localStorage.setItem("user", JSON.stringify(persistedUser));
      set({
        user: persistedUser,
        token,
        selectedSlug: ctx.selectedSlug,
        selectedCityId: ctx.selectedCityId,
        initialized: true,
      });
      return true;
    } catch (error) {
      // Só encerra sessão em não autorizado; erros de rede/5xx não disparam logout.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) {
        get().logout();
      }
      return false;
    }
  },

  setAdminCityId: (cityId) => {
    setCityContext({ cityId });
    set({ selectedCityId: cityId });
  },

  setAdminCityContext: ({ cityId, slug }) => {
    setCityContext({ cityId, slug: slug ?? undefined });
    set({
      selectedCityId: cityId,
      selectedSlug: slug ?? getSelectedCitySlug(),
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearCityContext();
    set({
      user: null,
      token: null,
      selectedSlug: null,
      selectedCityId: null,
      initialized: true,
    });
  },
}));
