"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";
import { filterNavCategoriesByRole, getNavForSystem } from "@/config/navigation";
import { useActiveSystem } from "@/hooks/use-active-system";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const HEADER_OFFSET = "top-[calc(4rem+env(safe-area-inset-top,0px))]";

export function PrivateShell({ children }: { children: ReactNode }) {
  const system = useActiveSystem();
  const role = useAuthStore((state) => state.user?.role);
  const navCategories = useMemo(
    () => filterNavCategoriesByRole(getNavForSystem(system), role),
    [system, role]
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useScrollToTop();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setIsMobileMenuOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <div data-system={system} className="flex h-[100dvh] min-h-[100dvh] flex-col bg-app-canvas">
      <AppHeader
        system={system}
        isMobile={isMobile}
        isMenuOpen={isMobileMenuOpen}
        onToggleMenu={() => setIsMobileMenuOpen((v) => !v)}
      />

      <div className="relative flex min-h-0 flex-1">
        {isMobile && isMobileMenuOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            className={cn("fixed inset-x-0 bottom-0 z-[65] bg-black/30 backdrop-blur-sm md:hidden", HEADER_OFFSET)}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div
          className={cn(
            "fixed bottom-0 left-0 z-[70] md:static md:z-auto md:h-full md:shrink-0",
            HEADER_OFFSET,
            "transition-[transform,width] duration-300 ease-out md:translate-x-0",
            isMobile && !isMobileMenuOpen && "-translate-x-full",
            !isMobile && (isSidebarCollapsed ? "md:w-16" : "md:w-64 lg:w-72")
          )}
        >
          <Suspense fallback={<div className="h-full w-full bg-white" />}>
            <Sidebar
              categories={navCategories}
              system={system}
              onNavigate={() => setIsMobileMenuOpen(false)}
              isMobile={isMobile}
              onCollapsedChange={setIsSidebarCollapsed}
            />
          </Suspense>
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-10 pt-4 md:p-6">
          <div className="mx-auto min-w-0 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
