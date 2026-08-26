"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BadgeNivel, Evolucao } from "@/components/relatorios/fluencia/tabela-estudantes";
import { exportarEstudanteExcel, exportarEstudantePptx } from "@/lib/relatorios-fluencia/exportar-aluno";
import { getPerfilEstudanteResultados } from "@/lib/api/afirme-reading/resultados";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import type { EdicaoCode, PerfilEstudanteRelatorio, ResultadoEstudante } from "@/lib/relatorios-fluencia/types";
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
  ano,
  edicao,
  avaliacaoId,
  onFechar,
}: {
  estudante: ResultadoEstudante | null;
  ano: number;
  edicao?: EdicaoCode;
  avaliacaoId?: string;
  onFechar: () => void;
}) {
  const [edicaoSel, setEdicaoSel] = useState<EdicaoCode | null>(edicao ?? null);
  const [perfil, setPerfil] = useState<PerfilEstudanteRelatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pptx" | null>(null);

  useEffect(() => {
    setEdicaoSel(edicao ?? estudante?.edicao ?? null);
  }, [estudante?.id, estudante?.edicao, edicao]);

  useEffect(() => {
    if (!estudante) {
      setPerfil(null);
      setError(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void getPerfilEstudanteResultados(estudante.id, { ano, edicao, avaliacaoId, signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        setPerfil(data);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setPerfil(null);
        setError(getApiErrorMessage(err, "Não foi possível carregar o perfil do estudante."));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [estudante?.id, ano, edicao, avaliacaoId]);

  if (!estudante) return null;

  const linha = perfil?.linhaDoTempo ?? [];
  const edicaoAtiva = edicaoSel ?? estudante.edicao;
  const linhaAtiva = linha.find((l) => l.edicao === edicaoAtiva);
  const registro = linhaAtiva?.resultado ?? (estudante.edicao === edicaoAtiva ? estudante : null);
  const avaliado = registro?.status === "presente";
  const edicaoLabel = linhaAtiva?.edicaoLabel ?? registro?.edicao ?? edicaoAtiva;

  const handleExcel = async () => {
    if (!perfil) return;
    setExporting("xlsx");
    try {
      await exportarEstudanteExcel(perfil, edicaoAtiva);
      toast.success("Planilha gerada.");
    } catch {
      toast.error("Não foi possível gerar o Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handlePptx = async () => {
    if (!perfil) return;
    setExporting("pptx");
    try {
      await exportarEstudantePptx(perfil, edicaoAtiva);
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
          <DialogTitle className="text-lg">{perfil?.nome ?? estudante.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Matrícula {perfil?.matricula ?? estudante.matricula} · {perfil?.escolaNome ?? estudante.escolaNome} · Turma{" "}
          {perfil?.turmaNome ?? estudante.turmaNome} · {perfil?.turno ?? estudante.turno} ·{" "}
          {perfil?.serieNome ?? estudante.serieNome} · {perfil?.municipioNome ?? estudante.municipioNome} (
          {perfil?.redeNome ?? estudante.redeNome}) · {edicaoLabel} {perfil?.ano ?? estudante.ano}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando perfil…
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleExcel()}
            disabled={exporting != null || !perfil}
          >
            {exporting === "xlsx" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Relatório do estudante (Excel)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handlePptx()}
            disabled={exporting != null || !perfil}
          >
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
          <BadgeNivel nivel={registro?.nivelAnterior ?? perfil?.perfilAnterior} />
          <div className="text-xs text-muted-foreground">Perfil atual:</div>
          <BadgeNivel nivel={registro?.nivel ?? perfil?.perfilAtual} />
          <Evolucao evolucao={registro?.evolucao ?? perfil?.evolucao} />
        </div>

        {registro && avaliado ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Item rotulo="PPM" valor={formatDecimal(registro.ppm)} />
            <Item rotulo="Precisão" valor={formatPct(registro.precisao)} />
            <Item rotulo="Prosódia" valor={registro.prosodiaLabel || "—"} />
            <Item
              rotulo="Compreensão"
              valor={`${registro.compreensaoAcertos}/${registro.compreensaoValidas} · ${formatPct(registro.compreensaoPct)}`}
            />
            <Item rotulo="Palavras corretas" valor={`${registro.palavrasCorretas}/${registro.totalPalavras}`} />
            <Item
              rotulo="P. desconhecidas"
              valor={`${registro.desconhecidasCorretas}/${registro.totalDesconhecidas}`}
            />
            <Item rotulo="Silabações / Soletrações" valor={`${registro.silabacoes} / ${registro.soletracoes}`} />
            <Item rotulo="Texto" valor={`${registro.textoPalavrasLidas} lidas · ${registro.textoErros} erros`} />
          </div>
        ) : (
          <p className="mt-4 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
            Estudante com status “{registro?.status ?? estudante.status}” nesta edição. Sem indicadores para exibir.
          </p>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Linha do tempo</h3>
          <p className="text-xs text-muted-foreground">Selecione a edição para ver os indicadores correspondentes.</p>
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
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l.edicaoLabel}</div>
                  <div className="text-sm font-medium">{l.nivelLabel || "Sem perfil"}</div>
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
