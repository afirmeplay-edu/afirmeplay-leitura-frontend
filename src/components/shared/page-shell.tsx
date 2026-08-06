import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-6 p-4 pb-10 md:p-6", className)}>{children}</div>;
}
