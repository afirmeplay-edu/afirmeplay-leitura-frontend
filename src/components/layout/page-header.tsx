import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, eyebrow, className, children }: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", className)}>
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-brand-highlight">
        Afirme Ler · Painel institucional
      </p>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {Icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-hero-from to-brand-hero-to text-white shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <span className="min-w-0 break-words">{title}</span>
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}
