"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const persistUser = useAuthStore((state) => state.persistUser);
  const logout = useAuthStore((state) => state.logout);
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

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
