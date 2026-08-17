"use client";

import { getPerfilLeitorStyle } from "@/lib/colors/reading-levels";
import type { DistribuicaoNivel } from "@/lib/relatorios-fluencia/types";

export function DistribuicaoBarra({ distribuicao }: { distribuicao: DistribuicaoNivel[] }) {
  const total = distribuicao.reduce((a, d) => a + d.percentual, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-10 w-full overflow-hidden rounded-lg border bg-muted/30">
        {distribuicao.map((d) => {
          if (d.percentual <= 0) return null;
          const width = (d.percentual / total) * 100;
          const style = getPerfilLeitorStyle(d.code);
          return (
            <div
              key={d.code}
              className="relative flex items-center justify-center px-0.5 font-semibold leading-none"
              style={{
                width: `${width}%`,
                backgroundColor: style.hex,
                color: style.fgHex,
                minWidth: d.percentual > 0 ? 4 : 0,
                fontSize: width < 10 ? "10px" : undefined,
              }}
              title={`${d.label}: ${d.percentual}%`}
            >
              <span className={width >= 10 ? "whitespace-nowrap text-xs" : "whitespace-nowrap"}>{d.percentual}%</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {distribuicao.map((d) => {
          const style = getPerfilLeitorStyle(d.code);
          return (
            <div key={d.code} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: style.hex }} />
              {d.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
