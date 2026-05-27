"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function AppProviders({ children }: PropsWithChildren) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
