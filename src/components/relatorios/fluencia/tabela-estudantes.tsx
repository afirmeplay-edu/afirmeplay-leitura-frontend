"use client";

import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { Badge } from "@/components/ui/badge";
import { evolucaoNivel } from "@/lib/relatorios-fluencia/calc";
import { PARAMETROS_LISTAS, type NivelCode, type ResultadoEstudante } from "@/lib/relatorios-fluencia/types";
import { studentBaseIdFromResultado } from "@/lib/relatorios-fluencia/relatorios.mock";
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

export function Evolucao({ de, para }: { de: NivelCode | null | undefined; para: NivelCode | null | undefined }) {
  const ev = evolucaoNivel(de ?? null, para ?? null);
  if (!ev) return <span className="text-xs text-muted-foreground">—</span>;
  if (ev === "avanco") return <span className="text-xs font-medium text-emerald-700">▲ avanço</span>;
  if (ev === "regressao") return <span className="text-xs font-medium text-red-600">▼ regressão</span>;
  return <span className="text-xs text-muted-foreground">→ manutenção</span>;
}

export function TabelaEstudantes({
  lista,
  anterior,
  onAbrir,
  limite = 200,
}: {
  lista: ResultadoEstudante[];
  anterior: ResultadoEstudante[];
  onAbrir: (e: ResultadoEstudante) => void;
  limite?: number;
}) {
  const antPorId = new Map(anterior.map((e) => [studentBaseIdFromResultado(e), e]));
  const visiveis = lista.slice(0, limite);

  if (!visiveis.length) {
    return <p className="text-sm text-muted-foreground">Dados insuficientes para cálculo.</p>;
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
            const ant = antPorId.get(studentBaseIdFromResultado(e)) ?? null;
            const presente = e.status === "presente";
            const compPct =
              e.compreensaoValidas > 0
                ? Math.round((e.compreensaoAcertos / e.compreensaoValidas) * 100)
                : null;
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
                  {e.palavrasCorretas}/{PARAMETROS_LISTAS.totalPalavras}
                </Td>
                <Td>
                  {e.desconhecidasCorretas}/{PARAMETROS_LISTAS.totalDesconhecidas}
                </Td>
                <Td>{presente ? e.ppm ?? "—" : "—"}</Td>
                <Td>{presente && e.precisao != null ? `${e.precisao}%` : "—"}</Td>
                <Td>
                  {presente ? (e.prosodiaAdequada ? "Adequada" : "Inadequada") : "—"}
                </Td>
                <Td>
                  {presente
                    ? `${e.compreensaoAcertos}/${e.compreensaoValidas} · ${compPct ?? "—"}%`
                    : "—"}
                </Td>
                <Td>
                  <BadgeNivel nivel={ant?.nivel} />
                </Td>
                <Td>
                  <BadgeNivel nivel={e.nivel} />
                </Td>
                <Td>
                  <Evolucao de={ant?.nivel} para={e.nivel} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
