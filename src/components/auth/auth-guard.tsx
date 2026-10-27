"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import { useAuthStore } from "@/stores/auth-store";

/** O JWT dura 3 h e o `persist-user` devolve um novo: renova antes de vencer (aplicação longa sem recarregar). */
const RENEW_BEFORE_MS = 10 * 60 * 1000;
const MIN_RENEW_DELAY_MS = 30 * 1000;

function msUntilExpiry(token: string | null) {
  const exp = token ? decodeJwtPayload(token)?.exp : undefined;
  return typeof exp === "number" ? exp * 1000 - Date.now() : null;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const persistUser = useAuthStore((state) => state.persistUser);
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!initialized) return;

      const token = useAuthStore.getState().token ?? localStorage.getItem("token");
      if (!token) {
        // Evita loop: user hidratado sem token faria /login → /app → /login
        logout();
        router.replace("/login");
        return;
      }

      const ok = await persistUser();
      if (cancelled) return;

      if (!ok) {
        const { token: currentToken, user } = useAuthStore.getState();
        // 401 já fez logout. Em erro de rede, mantém sessão local se ainda houver.
        if (!currentToken || !user?.id) {
          router.replace("/login");
          return;
        }
      }

      setChecking(false);
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [initialized, logout, persistUser, router]);

  useEffect(() => {
    if (checking || !token) return;
    const remaining = msUntilExpiry(token);
    if (remaining == null) return;
    const timer = window.setTimeout(
      () => void persistUser(),
      Math.max(remaining - RENEW_BEFORE_MS, MIN_RENEW_DELAY_MS)
    );
    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      const left = msUntilExpiry(useAuthStore.getState().token);
      if (left != null && left < RENEW_BEFORE_MS) void persistUser();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checking, token, persistUser]);

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
