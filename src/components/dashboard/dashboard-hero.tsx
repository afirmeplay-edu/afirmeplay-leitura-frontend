import Link from "next/link";
import { BookOpen, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/config/routes";

const LEVELS_HINT = "Nível de leitura (PL1–LF), escala ICA da fluência";
import { getPerfilLeitorStyle } from "@/lib/colors/reading-levels";
import { formatPct } from "@/lib/relatorios-fluencia/format";
import { NIVEIS, type DistribuicaoNivel } from "@/lib/relatorios-fluencia/types";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  distribuicao?: DistribuicaoNivel[] | null;
  className?: string;
}

export function DashboardHero({ distribuicao, className }: DashboardHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-hero-from to-brand-hero-to p-6 text-white shadow-sm sm:p-8",
        className
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Sistema de leitura
          </p>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Painel da Leitura</h1>
            <p className="max-w-2xl text-sm text-white/85 sm:text-base">
              Acompanhe fluência, precisão e compreensão da rede — de PL1 a leitor fluente.
            </p>
          </div>

          <TooltipProvider delayDuration={200}>
            <ul className="flex flex-wrap gap-2" aria-label={LEVELS_HINT}>
              {NIVEIS.map((nivel, index) => {
                const style = getPerfilLeitorStyle(nivel.code);
                const item = distribuicao?.find((d) => d.code === nivel.code);
                const label =
                  item != null ? `${nivel.short} ${formatPct(item.percentual)}` : nivel.short;

                const chip = (
                  <li
                    key={nivel.code}
                    tabIndex={index === 0 ? 0 : undefined}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: style.hex }}
                      aria-hidden
                    />
                    {label}
                  </li>
                );

                if (index !== 0) return chip;
                return (
                  <Tooltip key={nivel.code}>
                    <TooltipTrigger asChild>{chip}</TooltipTrigger>
                    <TooltipContent>{LEVELS_HINT}</TooltipContent>
                  </Tooltip>
                );
              })}
            </ul>
          </TooltipProvider>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <Button asChild className="bg-white text-slate-900 hover:bg-white/95 hover:text-slate-900">
            <Link href={ROUTES.leitura.fluencia.criar}>
              <BookOpen className="h-4 w-4" />
              Nova avaliação
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href={ROUTES.leitura.relatoriosFluencia}>
              <BarChart3 className="h-4 w-4" />
              Ver relatórios
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
