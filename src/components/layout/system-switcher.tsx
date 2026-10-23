"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardCheck, type LucideIcon } from "lucide-react";
import { APP_SYSTEMS, SYSTEM_HOME, SYSTEM_LABEL, type AppSystem } from "@/config/routes";
import { cn } from "@/lib/utils";

const SYSTEM_ICON: Record<AppSystem, LucideIcon> = {
  leitura: BookOpen,
  ica: ClipboardCheck,
};

const SYSTEM_HINT: Record<AppSystem, string> = {
  leitura: "Afirme Ler — fluência leitora (Alt+1)",
  ica: "Sistema ICA — Índice Criança Alfabetizada (Alt+2)",
};

interface SystemSwitcherProps {
  active: AppSystem;
  compact?: boolean;
}

export function SystemSwitcher({ active, compact = false }: SystemSwitcherProps) {
  const router = useRouter();
  const tabRefs = useRef<Record<AppSystem, HTMLButtonElement | null>>({ leitura: null, ica: null });
  const activeIndex = APP_SYSTEMS.indexOf(active);

  function go(system: AppSystem) {
    if (system === active) return;
    router.push(SYSTEM_HOME[system]);
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = event.code === "Digit1" ? 0 : event.code === "Digit2" ? 1 : -1;
      if (index < 0) return;
      event.preventDefault();
      const target = APP_SYSTEMS[index];
      if (target !== active) router.push(SYSTEM_HOME[target]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, router]);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = APP_SYSTEMS.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    const target = APP_SYSTEMS[next];
    tabRefs.current[target]?.focus();
    go(target);
  }

  return (
    <div
      role="tablist"
      aria-label="Sistema"
      className="relative grid grid-cols-2 rounded-full border bg-muted/60 p-1"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-200 ease-out"
        style={{
          background: "var(--system-gradient)",
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {APP_SYSTEMS.map((system, index) => {
        const Icon = SYSTEM_ICON[system];
        const selected = system === active;
        return (
          <button
            key={system}
            ref={(node) => {
              tabRefs.current[system] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={SYSTEM_HINT[system]}
            onClick={() => go(system)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={cn(
              "relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              compact ? "px-3" : "px-5",
              selected ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className={cn(compact && "sr-only")}>{SYSTEM_LABEL[system]}</span>
          </button>
        );
      })}
    </div>
  );
}
