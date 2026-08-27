import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type { StudentApplicationResult } from "@/lib/api/afirme-reading/types";
import type {
  CatalogoFiltrosRelatorio,
  EdicaoCode,
  ListResultadosQuery,
  PerfilEstudanteRelatorio,
  RelatorioResultados,
} from "@/lib/relatorios-fluencia/types";

function compactQuery(query: ListResultadosQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    ano: query.ano,
    edicao: query.edicao,
  };
  if (query.avaliacaoId) params.avaliacaoId = query.avaliacaoId;
  const optional: Array<keyof ListResultadosQuery> = [
    "redeId",
    "municipioId",
    "escolaId",
    "serieId",
    "turmaId",
    "turno",
    "por",
    "itemId",
  ];
  for (const key of optional) {
    const value = query[key];
    if (value) params[key] = value;
  }
  return params;
}

/** GET /afirme-reading/resultados/filtros */
export async function getResultadosFiltros(config?: { signal?: AbortSignal }) {
  const { data } = await afirmeReadingApi.get<CatalogoFiltrosRelatorio>("/resultados/filtros", {
    signal: config?.signal,
  });
  return data;
}

/** GET /afirme-reading/resultados */
export async function getRelatorioResultados(
  query: ListResultadosQuery,
  config?: { signal?: AbortSignal }
) {
  const { data } = await afirmeReadingApi.get<RelatorioResultados>("/resultados", {
    params: compactQuery(query),
    signal: config?.signal,
  });
  return data;
}

/** GET /afirme-reading/resultados/estudantes/:id */
export async function getPerfilEstudanteResultados(
  studentId: string,
  opts?: { ano?: number; edicao?: EdicaoCode; avaliacaoId?: string; signal?: AbortSignal }
) {
  const params: Record<string, string | number> = {};
  if (opts?.ano != null) params.ano = opts.ano;
  if (opts?.edicao) params.edicao = opts.edicao;
  if (opts?.avaliacaoId) params.avaliacaoId = opts.avaliacaoId;
  const { data } = await afirmeReadingApi.get<PerfilEstudanteRelatorio>(
    `/resultados/estudantes/${studentId}`,
    { params, signal: opts?.signal }
  );
  return data;
}

/** GET /afirme-reading/resultados/estudantes/:studentId/aplicacao?avaliacaoId= */
export async function getStudentApplication(
  studentId: string,
  evaluationId: string,
  config?: { signal?: AbortSignal }
) {
  const { data } = await afirmeReadingApi.get<StudentApplicationResult>(
    `/resultados/estudantes/${studentId}/aplicacao`,
    {
      params: { avaliacaoId: evaluationId },
      signal: config?.signal,
    }
  );
  return data;
}
