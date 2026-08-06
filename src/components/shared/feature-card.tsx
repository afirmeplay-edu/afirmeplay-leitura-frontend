import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENT_BORDERS = {
  emerald: "border-t-emerald-500",
  amber: "border-t-amber-500",
  blue: "border-t-blue-500",
  green: "border-t-green-500",
  purple: "border-t-purple-500",
  orange: "border-t-orange-500",
} as const;

interface FeatureCardProps {
  href: string;
  label: string;
  description: string;
  badge?: string;
  accent?: keyof typeof ACCENT_BORDERS;
}

export function FeatureCard({ href, label, description, badge, accent = "blue" }: FeatureCardProps) {
  return (
    <Link href={href} className="block min-w-0">
      <Card className={cn("h-full border-t-4 transition-shadow hover:shadow-md", ACCENT_BORDERS[accent])}>
        <CardContent className="space-y-3 p-6">
          {badge && <Badge variant="success">{badge}</Badge>}
          <h2 className="text-lg font-semibold text-foreground">{label}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Acessar <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
