"use client";

import { NIVEL_COLOR, type DistribuicaoNivel } from "@/lib/relatorios-fluencia/types";

export function DistribuicaoBarra({ distribuicao }: { distribuicao: DistribuicaoNivel[] }) {
  const total = distribuicao.reduce((a, d) => a + d.percentual, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-10 w-full overflow-hidden rounded-lg border bg-muted/30">
        {distribuicao.map((d) => {
          if (d.percentual <= 0) return null;
          const width = (d.percentual / total) * 100;
          const showLabel = width >= 8;
          return (
            <div
              key={d.code}
              className="relative flex items-center justify-center text-xs font-semibold text-white"
              style={{ width: `${width}%`, backgroundColor: NIVEL_COLOR[d.code], minWidth: d.percentual > 0 ? 4 : 0 }}
              title={`${d.label}: ${d.percentual}%`}
            >
              {showLabel ? `${d.percentual}%` : null}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {distribuicao.map((d) => (
          <div key={d.code} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NIVEL_COLOR[d.code] }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
