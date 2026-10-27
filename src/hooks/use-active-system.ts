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
  // Lido no primeiro render: o shell só monta no cliente (atrás do AuthGuard), então não há divergência de hidratação.
  const [lastSystem, setLastSystem] = useState<AppSystem>(() => routeSystem ?? readLastSystem());

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
