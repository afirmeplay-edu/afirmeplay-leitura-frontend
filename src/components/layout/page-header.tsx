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
    <header className={cn("space-y-3 sm:space-y-1.5", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:gap-3 sm:text-3xl">
            {Icon && <Icon className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" />}
            <span className="min-w-0 break-words text-foreground">{title}</span>
          </h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
