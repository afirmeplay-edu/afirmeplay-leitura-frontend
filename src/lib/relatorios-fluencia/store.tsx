"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import {
  getRelatorioResultados,
  getResultadosFiltros,
} from "@/lib/api/afirme-reading/resultados";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getSelectedCityId, getSelectedCitySlug } from "@/lib/city-domain";
import {
  avaliacoesDoFiltro,
  CATALOGO_VAZIO,
  type CatalogoFiltrosRelatorio,
  type EdicaoCode,
  type FiltrosRelatorio,
  type ListResultadosQuery,
  type RelatorioPor,
  type RelatorioPorRecorte,
  type RelatorioResultados,
} from "@/lib/relatorios-fluencia/types";

function hasCityContext() {
  return Boolean(getSelectedCityId() || getSelectedCitySlug());
}

function pickAvaliacaoId(catalog: CatalogoFiltrosRelatorio, ano: number, edicao: EdicaoCode) {
  const list = avaliacoesDoFiltro(catalog, ano, edicao);
  return list.length === 1 ? list[0].id : "";
}

function defaultFiltros(catalog: CatalogoFiltrosRelatorio): FiltrosRelatorio {
  const ano = catalog.anos.length > 0 ? catalog.anos[catalog.anos.length - 1] : new Date().getFullYear();
  const ids = catalog.edicoes.map((e) => e.id);
  const edicao: EdicaoCode = ids.includes("formativa")
    ? "formativa"
    : (ids[0] ?? "formativa");
  return {
    ano,
    edicao,
    avaliacaoId: pickAvaliacaoId(catalog, ano, edicao),
    redeId: "",
    municipioId: "",
    escolaId: "",
    serieId: "",
    turmaId: "",
    turno: "",
  };
}

function toQuery(filtros: FiltrosRelatorio, recorte?: { por: RelatorioPorRecorte; itemId: string }): ListResultadosQuery {
  return {
    ...filtros,
    ...(recorte?.itemId ? { por: recorte.por, itemId: recorte.itemId } : {}),
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
  relatorio: RelatorioResultados | null;
  catalog: CatalogoFiltrosRelatorio;
  catalogLoading: boolean;
  catalogError: string | null;
  reportLoading: boolean;
  reportError: string | null;
  recarregar: () => void;
  baixarRecorte: () => Promise<RelatorioResultados>;
};

const RelatorioCtx = createContext<Ctx | null>(null);

export function RelatorioFluenciaProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogoFiltrosRelatorio>(CATALOGO_VAZIO);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [filtros, setFiltrosState] = useState<FiltrosRelatorio>(() => defaultFiltros(CATALOGO_VAZIO));
  const [catalogReady, setCatalogReady] = useState(false);
  const [relatorioPor, setRelatorioPorState] = useState<RelatorioPor>("escola");
  const [itemId, setItemId] = useState("");
  const [relatorio, setRelatorio] = useState<RelatorioResultados | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    if (!hasCityContext()) {
      setCatalogLoading(false);
      setCatalogReady(false);
      setCatalogError(null);
      return;
    }
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await getResultadosFiltros({ signal });
      if (signal?.aborted) return;
      const catalogo: CatalogoFiltrosRelatorio = {
        anos: data.anos ?? [],
        edicoes: data.edicoes ?? [],
        avaliacoes: data.avaliacoes ?? [],
        redes: data.redes ?? [],
        municipios: data.municipios ?? [],
        escolas: data.escolas ?? [],
        series: data.series ?? [],
        turmas: data.turmas ?? [],
      };
      setCatalog(catalogo);
      setFiltrosState(defaultFiltros(catalogo));
      setCatalogReady(true);
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) return;
      setCatalogError(getApiErrorMessage(error, "Não foi possível carregar os filtros do relatório."));
      setCatalogReady(false);
    } finally {
      if (!signal?.aborted) setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadCatalog(ac.signal);
    return () => ac.abort();
  }, [loadCatalog]);

  useEffect(() => {
    if (!catalogReady) return;
    if (!hasCityContext()) return;
    if (!filtros.avaliacaoId) {
      setRelatorio(null);
      setReportLoading(false);
      setReportError(null);
      return;
    }
    const ac = new AbortController();
    setReportLoading(true);
    setReportError(null);
    void getRelatorioResultados(toQuery(filtros), { signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        setRelatorio(data);
      })
      .catch((error) => {
        if (ac.signal.aborted || axios.isCancel(error)) return;
        setRelatorio(null);
        setReportError(getApiErrorMessage(error, "Não foi possível carregar o relatório de fluência."));
      })
      .finally(() => {
        if (!ac.signal.aborted) setReportLoading(false);
      });
    return () => ac.abort();
  }, [catalogReady, filtros, reloadToken]);

  const setFiltros = (patch: Partial<FiltrosRelatorio>) => {
    setFiltrosState((prev) => {
      const next = { ...prev, ...patch };
      if ("ano" in patch || "edicao" in patch) {
        if (!("avaliacaoId" in patch)) {
          next.avaliacaoId = pickAvaliacaoId(catalog, next.ano, next.edicao);
        }
        next.escolaId = "";
        next.serieId = "";
        next.turmaId = "";
      }
      if ("avaliacaoId" in patch && patch.avaliacaoId !== prev.avaliacaoId) {
        next.escolaId = "";
        next.serieId = "";
        next.turmaId = "";
      }
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
  };

  const limparFiltros = () => {
    setFiltrosState(defaultFiltros(catalog));
    setItemId("");
  };

  const setRelatorioPor = (v: RelatorioPor) => {
    setRelatorioPorState(v);
    setItemId("");
  };

  const recarregar = () => {
    if (catalogError) {
      void loadCatalog();
      return;
    }
    setReloadToken((n) => n + 1);
  };

  const baixarRecorte = async () => {
    if (!filtros.avaliacaoId) {
      throw new Error("Selecione uma avaliação para baixar o relatório.");
    }
    if (!itemId || (relatorioPor !== "escola" && relatorioPor !== "turma")) {
      throw new Error("Selecione uma escola ou turma para baixar o recorte.");
    }
    return getRelatorioResultados(toQuery(filtros, { por: relatorioPor, itemId }));
  };

  const value: Ctx = {
    filtros,
    setFiltros,
    limparFiltros,
    relatorioPor,
    setRelatorioPor,
    itemId,
    setItemId,
    relatorio,
    catalog,
    catalogLoading,
    catalogError,
    reportLoading,
    reportError,
    recarregar,
    baixarRecorte,
  };

  return <RelatorioCtx.Provider value={value}>{children}</RelatorioCtx.Provider>;
}

export function useRelatorioFluencia() {
  const ctx = useContext(RelatorioCtx);
  if (!ctx) throw new Error("useRelatorioFluencia deve ser usado dentro de RelatorioFluenciaProvider");
  return ctx;
}
