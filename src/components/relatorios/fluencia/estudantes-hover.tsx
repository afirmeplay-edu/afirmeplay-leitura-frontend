"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getPerfilLeitorStyle } from "@/lib/colors/reading-levels";
import type { DistribuicaoNivel } from "@/lib/relatorios-fluencia/types";
import type { StudentInfoSeed } from "@/components/shared/student-info-dialog";

export function EstudantesHoverCount({
  bucket,
  ano,
  avaliacaoId,
  onSelectStudent,
}: {
  bucket: DistribuicaoNivel;
  ano?: number;
  avaliacaoId?: string;
  onSelectStudent?: (seed: StudentInfoSeed) => void;
}) {
  if (bucket.estudantes === 0) {
    return <span className="text-muted-foreground">0</span>;
  }

  const style = getPerfilLeitorStyle(bucket.code);

  const openStudent = (item: DistribuicaoNivel["lista"][number]) => {
    onSelectStudent?.({
      studentId: item.id,
      name: item.nome,
      className: item.turmaNome,
      perfilCode: bucket.code,
      ano,
      avaliacaoId,
    });
  };

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Ver ${bucket.estudantes} estudantes em ${bucket.label}`}
          onClick={() => {
            if (bucket.lista.length === 1) openStudent(bucket.lista[0]);
          }}
        >
          {bucket.estudantes}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 p-0">
        <div
          className="border-b px-3 py-2"
          style={{ backgroundColor: style.hex, color: style.fgHex }}
        >
          <p className="text-sm font-medium">{bucket.label}</p>
          <p className="text-xs opacity-90">{bucket.estudantes} estudante(s)</p>
        </div>
        <ul className="max-h-60 overflow-y-auto p-2 text-sm">
          {bucket.lista.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => openStudent(s)}
              >
                <span className="font-medium text-primary underline-offset-2 hover:underline">
                  {s.nome}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.turmaNome}</span>
              </button>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
