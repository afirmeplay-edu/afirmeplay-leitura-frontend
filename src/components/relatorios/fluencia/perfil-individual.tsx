"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeNivel, Evolucao } from "@/components/relatorios/fluencia/tabela-estudantes";
import {
  exportarEstudanteExcel,
  exportarEstudantePptx,
} from "@/lib/relatorios-fluencia/exportar-aluno";
import { getHistoricoEstudanteMock, studentBaseIdFromResultado } from "@/lib/relatorios-fluencia/relatorios.mock";
import { evolucaoNivel } from "@/lib/relatorios-fluencia/calc";
import {
  EDICAO_LABEL,
  EDICOES_ORDEM,
  PARAMETROS_LISTAS,
  type EdicaoCode,
  type ResultadoEstudante,
} from "@/lib/relatorios-fluencia/types";
import { PERFIL_LEITOR_LABEL } from "@/lib/colors/reading-levels";
import { cn } from "@/lib/utils";

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{valor}</div>
    </div>
  );
}

export function PerfilIndividual({
  estudante,
  onFechar,
}: {
  estudante: ResultadoEstudante | null;
  onFechar: () => void;
}) {
  const [edicaoSel, setEdicaoSel] = useState<EdicaoCode | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pptx" | null>(null);

  useEffect(() => {
    setEdicaoSel(estudante?.edicao ?? null);
  }, [estudante?.id, estudante?.edicao]);

  const historico = useMemo(() => {
    if (!estudante) return [];
    return getHistoricoEstudanteMock({
      studentId: studentBaseIdFromResultado(estudante),
      nome: estudante.nome,
      ano: estudante.ano,
    });
  }, [estudante]);

  if (!estudante) return null;

  const linha = EDICOES_ORDEM.map((ed) => {
    const reg = historico.find((h) => h.edicao === ed && h.ano === estudante.ano) ?? null;
    return { edicao: ed, nivel: reg?.nivel ?? null, reg };
  });
  const edicaoAtiva = edicaoSel ?? estudante.edicao;
  const registro = linha.find((l) => l.edicao === edicaoAtiva)?.reg ?? estudante;
  const atualIdx = linha.findIndex((l) => l.edicao === edicaoAtiva);
  const anterior = linha[atualIdx - 1]?.nivel ?? null;
  const atual = registro.nivel;
  const delta = evolucaoNivel(anterior, atual);
  const avaliado = registro.status === "presente";
  const compPct =
    registro.compreensaoValidas > 0
      ? Math.round((registro.compreensaoAcertos / registro.compreensaoValidas) * 100)
      : null;

  const handleExcel = async () => {
    setExporting("xlsx");
    try {
      await exportarEstudanteExcel(registro, historico);
      toast.success("Planilha gerada.");
    } catch {
      toast.error("Não foi possível gerar o Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handlePptx = async () => {
    setExporting("pptx");
    try {
      await exportarEstudantePptx(registro, historico);
      toast.success("Apresentação gerada.");
    } catch {
      toast.error("Não foi possível gerar o PowerPoint.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{estudante.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Matrícula {estudante.matricula} · {estudante.escolaNome} · Turma {estudante.turmaNome} ·{" "}
          {estudante.turno} · {estudante.serieNome} · {estudante.municipioNome} ({estudante.redeNome}) ·{" "}
          {EDICAO_LABEL[edicaoAtiva]} {estudante.ano}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleExcel()} disabled={exporting != null}>
            {exporting === "xlsx" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Relatório do estudante (Excel)
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handlePptx()} disabled={exporting != null}>
            {exporting === "pptx" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="mr-2 h-4 w-4" />
            )}
            Relatório do estudante (PowerPoint)
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="text-xs text-muted-foreground">Perfil anterior:</div>
          <BadgeNivel nivel={anterior} />
          <div className="text-xs text-muted-foreground">Perfil atual:</div>
          <BadgeNivel nivel={atual} />
          {delta ? <Evolucao de={anterior} para={atual} /> : null}
        </div>

        {avaliado ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Item rotulo="PPM" valor={registro.ppm != null ? String(registro.ppm) : "—"} />
            <Item rotulo="Precisão" valor={registro.precisao != null ? `${registro.precisao}%` : "—"} />
            <Item rotulo="Prosódia" valor={registro.prosodiaAdequada ? "Adequada" : "Inadequada"} />
            <Item
              rotulo="Compreensão"
              valor={`${registro.compreensaoAcertos}/${registro.compreensaoValidas} · ${compPct ?? "—"}%`}
            />
            <Item
              rotulo="Palavras corretas"
              valor={`${registro.palavrasCorretas}/${PARAMETROS_LISTAS.totalPalavras}`}
            />
            <Item
              rotulo="P. desconhecidas"
              valor={`${registro.desconhecidasCorretas}/${PARAMETROS_LISTAS.totalDesconhecidas}`}
            />
            <Item
              rotulo="Silabações / Soletrações"
              valor={`${registro.silabacoes} / ${registro.soletracoes}`}
            />
            <Item
              rotulo="Texto"
              valor={`${registro.textoPalavrasLidas} lidas · ${registro.textoErros} erros`}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
            Estudante com status “{registro.status}” nesta edição. Dados insuficientes para cálculo dos
            indicadores.
          </p>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Linha do tempo</h3>
          <p className="text-xs text-muted-foreground">
            Selecione a edição para ver os indicadores correspondentes.
          </p>
          <ol className="mt-3 flex flex-wrap items-center gap-2">
            {linha.map((l, i) => (
              <li key={l.edicao} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEdicaoSel(l.edicao)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors hover:bg-accent",
                    l.edicao === edicaoAtiva
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  )}
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {EDICAO_LABEL[l.edicao]}
                  </div>
                  <div className="text-sm font-medium">
                    {l.nivel ? PERFIL_LEITOR_LABEL[l.nivel] : "Sem perfil"}
                  </div>
                </button>
                {i < linha.length - 1 ? <span className="text-muted-foreground">→</span> : null}
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
