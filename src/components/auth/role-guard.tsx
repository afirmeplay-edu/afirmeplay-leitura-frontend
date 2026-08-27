"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

interface RoleGuardProps {
  allow: (role: string | null | undefined) => boolean;
  fallbackHref?: string;
  children: ReactNode;
}

export function RoleGuard({ allow, fallbackHref = "/app", children }: RoleGuardProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const permitted = allow(user?.role);

  useEffect(() => {
    if (!initialized) return;
    if (!permitted) router.replace(fallbackHref);
  }, [fallbackHref, initialized, permitted, router]);

  if (!initialized || !permitted) {
    return <div className="p-6 text-sm text-muted-foreground">Verificando permissão...</div>;
  }

  return <>{children}</>;
}
