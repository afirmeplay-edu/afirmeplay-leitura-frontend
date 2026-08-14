import {
  EDICAO_ANTERIOR,
  LEITORES_FLUENTES,
  NIVEIS,
  PRE_LEITORES,
  type DistribuicaoNivel,
  type EdicaoCode,
  type FiltrosRelatorio,
  type Indicadores,
  type NivelCode,
  type ResumoEscola,
  type ResumoTurma,
  type ResultadoEstudante,
} from "./types";

export function filtrarResultados(
  todos: ResultadoEstudante[],
  filtros: FiltrosRelatorio
): ResultadoEstudante[] {
  return todos.filter((r) => {
    if (r.ano !== filtros.ano) return false;
    if (r.edicao !== filtros.edicao) return false;
    if (filtros.redeId && r.redeId !== filtros.redeId) return false;
    if (filtros.municipioId && r.municipioId !== filtros.municipioId) return false;
    if (filtros.escolaId && r.escolaId !== filtros.escolaId) return false;
    if (filtros.serieId && r.serieId !== filtros.serieId) return false;
    if (filtros.turmaId && r.turmaId !== filtros.turmaId) return false;
    if (filtros.turno && r.turno !== filtros.turno) return false;
    return true;
  });
}

export function calcularIndicadores(resultados: ResultadoEstudante[]): Indicadores {
  const previstos = resultados.length;
  const avaliadosList = resultados.filter((r) => r.avaliado && r.nivel);
  const avaliados = avaliadosList.length;
  const participacao = previstos > 0 ? Math.round((avaliados / previstos) * 1000) / 10 : 0;

  const distribuicao: DistribuicaoNivel[] = NIVEIS.map((n) => {
    const lista = avaliadosList
      .filter((r) => r.nivel === n.code)
      .map((r) => ({ id: r.id, nome: r.nome, turmaNome: r.turmaNome }));
    const estudantes = lista.length;
    const percentual = avaliados > 0 ? Math.round((estudantes / avaliados) * 1000) / 10 : 0;
    return {
      code: n.code,
      label: n.label,
      estudantes,
      percentual,
      percentualAnterior: null,
      delta: null,
      lista,
    };
  });

  const ifl =
    avaliados > 0
      ? Math.round(
          (avaliadosList.reduce((acc, r) => {
            const peso = NIVEIS.find((n) => n.code === r.nivel)?.pesoIfl ?? 0;
            return acc + peso;
          }, 0) /
            avaliados) *
            10
        ) / 10
      : 0;

  const fluentes = avaliadosList.filter((r) => LEITORES_FLUENTES.includes(r.nivel as NivelCode)).length;
  const pre = avaliadosList.filter((r) => PRE_LEITORES.includes(r.nivel as NivelCode)).length;

  const ppmVals = avaliadosList.map((r) => r.ppm!).filter((v) => v != null);
  const precVals = avaliadosList.map((r) => r.precisao!).filter((v) => v != null);

  return {
    previstos,
    avaliados,
    participacao,
    ifl,
    leitoresFluentesPct: avaliados > 0 ? Math.round((fluentes / avaliados) * 1000) / 10 : 0,
    preLeitoresPct: avaliados > 0 ? Math.round((pre / avaliados) * 1000) / 10 : 0,
    ppmMedio: ppmVals.length
      ? Math.round((ppmVals.reduce((a, b) => a + b, 0) / ppmVals.length) * 10) / 10
      : 0,
    precisaoMedia: precVals.length
      ? Math.round((precVals.reduce((a, b) => a + b, 0) / precVals.length) * 10) / 10
      : 0,
    distribuicao,
  };
}

export function anexarComparacaoAnterior(
  atual: Indicadores,
  anterior: Indicadores | null
): Indicadores {
  if (!anterior) return atual;
  return {
    ...atual,
    distribuicao: atual.distribuicao.map((d) => {
      const prev = anterior.distribuicao.find((x) => x.code === d.code);
      const percentualAnterior = prev?.percentual ?? 0;
      const delta = Math.round((d.percentual - percentualAnterior) * 10) / 10;
      return { ...d, percentualAnterior, delta };
    }),
  };
}

export function resumoPorEscola(resultados: ResultadoEstudante[]): ResumoEscola[] {
  const map = new Map<string, ResultadoEstudante[]>();
  for (const r of resultados) {
    const list = map.get(r.escolaId) ?? [];
    list.push(r);
    map.set(r.escolaId, list);
  }
  return Array.from(map.entries())
    .map(([escolaId, list]) => ({
      escolaId,
      escolaNome: list[0]?.escolaNome ?? escolaId,
      ...calcularIndicadores(list),
    }))
    .sort((a, b) => a.escolaNome.localeCompare(b.escolaNome, "pt-BR"));
}

export function resumoPorTurma(resultados: ResultadoEstudante[]): ResumoTurma[] {
  const map = new Map<string, ResultadoEstudante[]>();
  for (const r of resultados) {
    const list = map.get(r.turmaId) ?? [];
    list.push(r);
    map.set(r.turmaId, list);
  }
  return Array.from(map.entries())
    .map(([turmaId, list]) => ({
      turmaId,
      turmaNome: list[0]?.turmaNome ?? turmaId,
      escolaNome: list[0]?.escolaNome ?? "",
      ...calcularIndicadores(list),
    }))
    .sort((a, b) => a.turmaNome.localeCompare(b.turmaNome, "pt-BR"));
}

export function filtrosEdicaoAnterior(filtros: FiltrosRelatorio): FiltrosRelatorio | null {
  const ant = EDICAO_ANTERIOR[filtros.edicao as EdicaoCode];
  if (!ant) return null;
  return { ...filtros, edicao: ant };
}

export function labelEscopo(
  filtros: FiltrosRelatorio,
  nomes: {
    rede?: string;
    municipio?: string;
    escola?: string;
    serie?: string;
    turma?: string;
  }
): string {
  const parts = [
    nomes.rede ?? (filtros.redeId ? undefined : "Todas as redes"),
    nomes.municipio ?? (filtros.municipioId ? undefined : "Todos os municípios"),
    nomes.escola ?? (filtros.escolaId ? undefined : "Todas as escolas"),
    nomes.serie ?? (filtros.serieId ? undefined : "Todas as séries"),
    nomes.turma ?? (filtros.turmaId ? undefined : "Todas as turmas"),
  ].filter(Boolean);
  if (filtros.turno) parts.push(filtros.turno);
  return parts.join(" · ");
}

export function pctNivel(ind: Indicadores, code: NivelCode): number {
  return ind.distribuicao.find((d) => d.code === code)?.percentual ?? 0;
}
