"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  anexarComparacaoAnterior,
  calcularIndicadores,
  filtrarResultados,
  filtrosEdicaoAnterior,
  labelEscopo,
  resumoPorEscola,
  resumoPorTurma,
} from "@/lib/relatorios-fluencia/calc";
import { gerarAlertas, gerarLeituraAnalitica } from "@/lib/relatorios-fluencia/analise";
import { getRelatoriosFluenciaMock } from "@/lib/relatorios-fluencia/relatorios.mock";
import {
  EDICAO_LABEL,
  type FiltrosRelatorio,
  type RelatorioComputado,
  type RelatorioPor,
  type ResultadoEstudante,
} from "@/lib/relatorios-fluencia/types";

const mock = getRelatoriosFluenciaMock();

export const FILTROS_INICIAIS: FiltrosRelatorio = {
  ano: 2026,
  edicao: "formativa",
  redeId: "",
  municipioId: "",
  escolaId: "",
  serieId: "",
  turmaId: "",
  turno: "",
};

function aplicarRecorteLista(
  lista: ResultadoEstudante[],
  viewMode?: RelatorioPor,
  viewItemId?: string
): ResultadoEstudante[] {
  if (!viewMode || !viewItemId) return lista;
  if (viewMode === "escola") return lista.filter((r) => r.escolaId === viewItemId);
  if (viewMode === "turma") return lista.filter((r) => r.turmaId === viewItemId);
  // estudante: id mock = alu-X-ano-edicao
  return lista.filter((r) => r.id.startsWith(`${viewItemId}-`) || r.id === viewItemId);
}

export function computarRelatorio(
  filtros: FiltrosRelatorio,
  viewMode?: RelatorioPor,
  viewItemId?: string
): RelatorioComputado {
  const resultados = aplicarRecorteLista(filtrarResultados(mock.resultados, filtros), viewMode, viewItemId);

  const anterioresFiltros = filtrosEdicaoAnterior(filtros);
  const anterioresRaw = anterioresFiltros
    ? aplicarRecorteLista(filtrarResultados(mock.resultados, anterioresFiltros), viewMode, viewItemId)
    : [];

  const indicadoresBase = calcularIndicadores(resultados);
  const indicadoresAnteriores = anterioresFiltros ? calcularIndicadores(anterioresRaw) : null;
  const indicadores = anexarComparacaoAnterior(indicadoresBase, indicadoresAnteriores);

  const rede = mock.redes.find((x) => x.id === filtros.redeId);
  const municipio = mock.municipios.find((x) => x.id === filtros.municipioId);
  const escola = mock.escolas.find((x) => x.id === filtros.escolaId);
  const serie = mock.series.find((x) => x.id === filtros.serieId);
  const turma = mock.turmas.find((x) => x.id === filtros.turmaId);

  return {
    filtros,
    escopoLabel: labelEscopo(filtros, {
      rede: rede?.nome,
      municipio: municipio?.nome,
      escola: escola?.nome,
      serie: serie?.nome,
      turma: turma?.nome,
    }),
    tituloEdicao: `${EDICAO_LABEL[filtros.edicao]} ${filtros.ano}`,
    emitidoEm: new Date(),
    indicadores,
    indicadoresAnteriores,
    porEscola: resumoPorEscola(resultados),
    porTurma: resumoPorTurma(resultados),
    leituraAnalitica: gerarLeituraAnalitica(indicadores, indicadoresAnteriores, EDICAO_LABEL[filtros.edicao]),
    alertas: gerarAlertas(indicadores, indicadoresAnteriores),
    resultados,
  };
}

type Ctx = {
  filtros: FiltrosRelatorio;
  setFiltros: (patch: Partial<FiltrosRelatorio>) => void;
  limparFiltros: () => void;
  relatorioPor: RelatorioPor;
  setRelatorioPor: (v: RelatorioPor) => void;
  itemId: string;
  setItemId: (v: string) => void;
  aplicarRecorte: () => void;
  relatorio: RelatorioComputado;
  catalog: ReturnType<typeof getRelatoriosFluenciaMock>;
};

const RelatorioCtx = createContext<Ctx | null>(null);

export function RelatorioFluenciaProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<FiltrosRelatorio>(FILTROS_INICIAIS);
  const [relatorioPor, setRelatorioPor] = useState<RelatorioPor>("escola");
  const [itemId, setItemId] = useState("");
  const [recorte, setRecorte] = useState<{ mode: RelatorioPor; id: string } | null>(null);

  const setFiltros = (patch: Partial<FiltrosRelatorio>) => {
    setFiltrosState((prev) => {
      const next = { ...prev, ...patch };
      if ("redeId" in patch && patch.redeId !== prev.redeId) {
        next.municipioId = "";
        next.escolaId = "";
        next.turmaId = "";
      }
      if ("municipioId" in patch && patch.municipioId !== prev.municipioId) {
        next.escolaId = "";
        next.turmaId = "";
      }
      if ("escolaId" in patch && patch.escolaId !== prev.escolaId) {
        next.turmaId = "";
      }
      return next;
    });
    setRecorte(null);
  };

  const limparFiltros = () => {
    setFiltrosState(FILTROS_INICIAIS);
    setItemId("");
    setRecorte(null);
  };

  const aplicarRecorte = () => {
    if (!itemId) return;
    setRecorte({ mode: relatorioPor, id: itemId });
  };

  const relatorio = useMemo(() => computarRelatorio(filtros, recorte?.mode, recorte?.id), [filtros, recorte]);

  const value: Ctx = {
    filtros,
    setFiltros,
    limparFiltros,
    relatorioPor,
    setRelatorioPor: (v) => {
      setRelatorioPor(v);
      setItemId("");
      setRecorte(null);
    },
    itemId,
    setItemId,
    aplicarRecorte,
    relatorio,
    catalog: mock,
  };

  return <RelatorioCtx.Provider value={value}>{children}</RelatorioCtx.Provider>;
}

export function useRelatorioFluencia() {
  const ctx = useContext(RelatorioCtx);
  if (!ctx) throw new Error("useRelatorioFluencia deve ser usado dentro de RelatorioFluenciaProvider");
  return ctx;
}
