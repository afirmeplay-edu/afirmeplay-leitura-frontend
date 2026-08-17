"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FullscreenLayoutProps {
  title: string;
  subtitle?: ReactNode;
  subtitleTitle?: string;
  backHref?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export function FullscreenLayout({
  title,
  subtitle,
  subtitleTitle,
  backHref,
  onClose,
  children,
  className,
}: FullscreenLayoutProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const subtitleHint = subtitleTitle ?? (typeof subtitle === "string" ? subtitle : undefined);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex flex-col bg-background",
        "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b bg-white px-3 py-2.5 shadow-sm sm:items-center sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
          {backHref && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold leading-snug text-foreground sm:text-lg">{title}</h1>
            {subtitle ? (
              <div
                className="mt-0.5 max-w-3xl whitespace-normal break-words text-xs leading-snug text-muted-foreground sm:text-sm"
                title={subtitleHint}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
