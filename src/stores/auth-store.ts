"use client";

import { create } from "zustand";
import { createCityApi } from "@/lib/api/client";

export interface User {
  id: string;
  name: string;
  email: string;
  registration: string;
  role: string;
  tenant_id: string | null;
  city_slug?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  selectedSlug: string | null;
  loading: boolean;
  initialized: boolean;
  login: (slug: string, registration: string, password: string) => Promise<void>;
  persistUser: () => Promise<boolean>;
  hydrate: () => void;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  selectedSlug: null,
  loading: false,
  initialized: false,

  hydrate: () => {
    const token = localStorage.getItem("token");
    const user = parseStorage<User>(localStorage.getItem("user"));
    const selectedSlug = localStorage.getItem("selected_slug");
    set({ token, user, selectedSlug, initialized: true });
  },

  login: async (slug, registration, password) => {
    set({ loading: true });
    try {
      const cityApi = createCityApi();
      const { data } = await cityApi.post("/login/", { registration, password });
      const token = data?.token as string;
      const user = data?.user as User;
      if (!token || !user?.id) {
        throw new Error("Resposta de login inválida.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("selected_slug", slug);

      set({
        token,
        user,
        selectedSlug: slug,
      });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  persistUser: async () => {
    const token = get().token ?? localStorage.getItem("token");
    const slug = get().selectedSlug ?? localStorage.getItem("selected_slug");
    if (!token || !slug) {
      return false;
    }

    try {
      const cityApi = createCityApi();
      cityApi.defaults.headers.common.Authorization = `Bearer ${token}`;
      const { data } = await cityApi.get("/persist-user/");
      const persistedUser = (data?.user ?? data) as User;
      if (!persistedUser?.id) return false;

      localStorage.setItem("user", JSON.stringify(persistedUser));
      set({ user: persistedUser, token, selectedSlug: slug, initialized: true });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selected_slug");
    set({
      user: null,
      token: null,
      selectedSlug: null,
      initialized: true,
    });
  },
}));
