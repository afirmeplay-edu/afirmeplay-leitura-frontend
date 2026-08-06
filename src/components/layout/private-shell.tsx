"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { cn } from "@/lib/utils";

export function PrivateShell({ children }: { children: ReactNode }) {
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
    <div className="flex h-[100dvh] min-h-[100dvh] bg-background">
      <header className="fixed inset-x-0 top-0 z-[60] flex h-14 items-center justify-between border-b bg-background/95 px-3 pt-[env(safe-area-inset-top,0px)] shadow-sm backdrop-blur-md md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsMobileMenuOpen((v) => !v)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex min-w-0 flex-1 items-center justify-center px-2">
          <Image
            src="/AFIRME-PLAY-LOGO-branco.png"
            alt="Afirme Play"
            width={130}
            height={44}
            className="h-8 w-auto max-w-[140px] object-contain [filter:brightness(0)_saturate(100%)_invert(18%)_sepia(90%)_saturate(1500%)_hue-rotate(205deg)]"
          />
        </div>
        <div className="h-9 w-9 shrink-0" aria-hidden />
      </header>

      {isMobile && isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-[65] bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[70] h-[100dvh] md:sticky md:top-0 md:z-auto md:shrink-0 md:self-start",
          "transition-[transform,width] duration-300 ease-out md:translate-x-0",
          isMobile && !isMobileMenuOpen && "-translate-x-full",
          !isMobile && (isSidebarCollapsed ? "md:w-16" : "md:w-64 lg:w-72")
        )}
      >
        <Suspense fallback={<div className="h-[100dvh] w-full" style={{ background: "var(--sidebar-bg, #eff6ff)" }} />}>
          <Sidebar
            onNavigate={() => setIsMobileMenuOpen(false)}
            isMobile={isMobile}
            onCollapsedChange={setIsSidebarCollapsed}
          />
        </Suspense>
      </div>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-10 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:p-6 md:pt-6">
        <div className="mx-auto min-w-0 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
