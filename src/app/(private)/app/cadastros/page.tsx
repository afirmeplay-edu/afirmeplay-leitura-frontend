"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminRole } from "@/lib/auth/jwt";
import { CADASTROS_PATHS } from "@/lib/cadastros/config";
import { useAuthStore } from "@/stores/auth-store";

export default function CadastrosIndexPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) return;
    router.replace(
      isAdminRole(user?.role) ? CADASTROS_PATHS.conhecidas : CADASTROS_PATHS.poucoComuns
    );
  }, [initialized, router, user?.role]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecionando para Cadastros...</div>;
}
