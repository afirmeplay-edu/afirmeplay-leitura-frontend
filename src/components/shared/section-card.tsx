import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "highlight";
  className?: string;
}

export function SectionCard({ title, description, children, actions, variant = "default", className }: SectionCardProps) {
  return (
    <Card
      className={cn(
        variant === "highlight" && "border-slate-700 bg-slate-800 text-white [&_.text-muted-foreground]:text-slate-300",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className={cn(variant === "highlight" && "text-white")}>{title}</CardTitle>
          {description && <CardDescription className={cn(variant === "highlight" && "text-slate-300")}>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
