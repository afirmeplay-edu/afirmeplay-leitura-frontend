"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getSystemFromPathname,
  readLastSystem,
  writeLastSystem,
  type AppSystem,
} from "@/config/routes";

/** Sistema da URL; em rotas neutras (`/app/perfil`) usa o último sistema visitado. */
export function useActiveSystem(): AppSystem {
  const pathname = usePathname();
  const routeSystem = getSystemFromPathname(pathname);
  const [lastSystem, setLastSystem] = useState<AppSystem>("leitura");

  useEffect(() => {
    if (routeSystem) {
      writeLastSystem(routeSystem);
      setLastSystem(routeSystem);
    } else {
      setLastSystem(readLastSystem());
    }
  }, [routeSystem]);

  return routeSystem ?? lastSystem;
}
