"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { DistribuicaoNivel } from "@/lib/relatorios-fluencia/types";

export function EstudantesHoverCount({ bucket }: { bucket: DistribuicaoNivel }) {
  if (bucket.estudantes === 0) {
    return <span className="text-muted-foreground">0</span>;
  }

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Ver ${bucket.estudantes} estudantes em ${bucket.label}`}
        >
          {bucket.estudantes}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">{bucket.label}</p>
          <p className="text-xs text-muted-foreground">{bucket.estudantes} estudante(s)</p>
        </div>
        <ul className="max-h-60 overflow-y-auto p-2 text-sm">
          {bucket.lista.map((s) => (
            <li key={s.id} className="rounded px-2 py-1.5 hover:bg-muted/60">
              <span className="font-medium text-foreground">{s.nome}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{s.turmaNome}</span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
