"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readLastSystem, ROUTES, SYSTEM_HOME } from "@/config/routes";
import { useAuthStore } from "@/stores/auth-store";

export function HomeRedirect() {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const persistUser = useAuthStore((state) => state.persistUser);

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    async function redirect() {
      const token = useAuthStore.getState().token ?? localStorage.getItem("token");
      if (!token) {
        router.replace(ROUTES.login);
        return;
      }

      const ok = await persistUser();
      if (cancelled) return;

      router.replace(ok ? SYSTEM_HOME[readLastSystem()] : ROUTES.login);
    }

    void redirect();

    return () => {
      cancelled = true;
    };
  }, [initialized, persistUser, router]);

  return <div className="min-h-screen bg-background" />;
}
