"use client";

import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { Badge } from "@/components/ui/badge";
import { formatDecimal, formatPct, labelEvolucao } from "@/lib/relatorios-fluencia/format";
import type { EvolucaoCode, NivelCode, ResultadoEstudante } from "@/lib/relatorios-fluencia/types";
import { cn } from "@/lib/utils";

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td title={title} className={cn("whitespace-nowrap px-3 py-2 text-sm tabular-nums", className)}>
      {children}
    </td>
  );
}

export function BadgeNivel({ nivel }: { nivel: NivelCode | null | undefined }) {
  if (!nivel) return <span className="text-xs text-muted-foreground">Sem perfil</span>;
  return <PerfilLeitorBadge code={nivel} className="rounded-md" />;
}

export function Evolucao({ evolucao }: { evolucao: EvolucaoCode | null | undefined }) {
  const label = labelEvolucao(evolucao);
  if (!evolucao) return <span className="text-xs text-muted-foreground">—</span>;
  if (evolucao === "avanco") return <span className="text-xs font-medium text-emerald-700">{label}</span>;
  if (evolucao === "regressao") return <span className="text-xs font-medium text-red-600">{label}</span>;
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

export function TabelaEstudantes({
  lista,
  onAbrir,
  limite = 200,
}: {
  lista: ResultadoEstudante[];
  onAbrir: (e: ResultadoEstudante) => void;
  limite?: number;
}) {
  const visiveis = lista.slice(0, limite);

  if (!visiveis.length) {
    return <p className="text-sm text-muted-foreground">Nenhum estudante no recorte.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr className="border-b">
            <Th>Estudante</Th>
            <Th>Palavras</Th>
            <Th>P. desconhecidas</Th>
            <Th>PPM texto</Th>
            <Th>Precisão</Th>
            <Th>Prosódia</Th>
            <Th>Compreensão</Th>
            <Th>Perfil anterior</Th>
            <Th>Perfil atual</Th>
            <Th>Evolução</Th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((e) => {
            const presente = e.status === "presente";
            return (
              <tr
                key={e.id}
                className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/50"
                onClick={() => onAbrir(e)}
              >
                <Td className="max-w-[15rem] font-medium">
                  <span className="whitespace-normal">{e.nome}</span>
                  {e.status !== "presente" ? (
                    <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                      {e.status}
                    </Badge>
                  ) : null}
                </Td>
                <Td>
                  {e.palavrasCorretas}/{e.totalPalavras}
                </Td>
                <Td>
                  {e.desconhecidasCorretas}/{e.totalDesconhecidas}
                </Td>
                <Td>{presente ? formatDecimal(e.ppm) : "—"}</Td>
                <Td>{presente ? formatPct(e.precisao) : "—"}</Td>
                <Td>{presente ? e.prosodiaLabel || "—" : "—"}</Td>
                <Td>
                  {presente
                    ? `${e.compreensaoAcertos}/${e.compreensaoValidas} · ${formatPct(e.compreensaoPct)}`
                    : "—"}
                </Td>
                <Td>
                  <BadgeNivel nivel={e.nivelAnterior} />
                </Td>
                <Td>
                  <BadgeNivel nivel={e.nivel} />
                </Td>
                <Td>
                  <Evolucao evolucao={e.evolucao} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
