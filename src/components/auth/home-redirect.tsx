"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function HomeRedirect() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user?.id) {
      router.replace("/app");
      return;
    }
    router.replace("/login");
  }, [router, user?.id]);

  return <div className="min-h-screen bg-background" />;
}
