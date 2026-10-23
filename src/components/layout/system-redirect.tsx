"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readLastSystem, SYSTEM_HOME } from "@/config/routes";

export function SystemRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(SYSTEM_HOME[readLastSystem()]);
  }, [router]);

  return null;
}
