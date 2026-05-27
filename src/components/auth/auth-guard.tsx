"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const persistUser = useAuthStore((state) => state.persistUser);
  const [checking, setChecking] = useState(true);

  const isAuthenticated = useMemo(() => Boolean(user?.id), [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!initialized) return;

      if (isAuthenticated) {
        if (!cancelled) setChecking(false);
        return;
      }

      const ok = await persistUser();
      if (cancelled) return;

      if (!ok) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [initialized, isAuthenticated, persistUser, router]);

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
