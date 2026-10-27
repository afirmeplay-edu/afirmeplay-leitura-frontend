"use client";

import { useEffect } from "react";
import { setNavigationGuard } from "@/lib/navigation-guard";

const DEFAULT_MESSAGE = "Há alterações não salvas. Deseja sair mesmo assim?";

/** Avisa ao recarregar/fechar a aba, ao clicar em links internos e em navegações que usam `confirmNavigation`. */
export function useUnsavedChangesWarning(dirty: boolean, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!dirty) return;

    const ask = () => window.confirm(message);

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onClickCapture(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!ask()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    setNavigationGuard(ask);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      setNavigationGuard(null);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [dirty, message]);
}
