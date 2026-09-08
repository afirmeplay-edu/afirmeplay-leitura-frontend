import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  /** default: painel branco; highlight: card inteiro em gradiente; banner: faixa gradiente no topo */
  variant?: "default" | "highlight" | "banner";
  icon?: LucideIcon;
  className?: string;
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  variant = "default",
  icon: Icon,
  className,
}: SectionCardProps) {
  const highlight = variant === "highlight";
  const banner = variant === "banner";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        highlight &&
          "border-0 bg-gradient-to-r from-brand-hero-from to-brand-hero-to text-white [&_.text-muted-foreground]:text-white/80",
        className
      )}
    >
      {banner ? (
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-brand-hero-from to-brand-hero-to px-6 py-4 text-white">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
              {description ? <p className="text-sm text-white/85">{description}</p> : null}
            </div>
          </div>
          {actions}
        </div>
      ) : (
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  highlight
                    ? "bg-white/15 text-white"
                    : "bg-gradient-to-br from-brand-hero-from to-brand-hero-to text-white"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0 space-y-1">
              <CardTitle className={cn("text-lg", highlight && "text-white")}>{title}</CardTitle>
              {description ? (
                <CardDescription className={cn(highlight && "text-white/80")}>{description}</CardDescription>
              ) : null}
            </div>
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className={cn(banner && "pt-6")}>{children}</CardContent>
    </Card>
  );
}
