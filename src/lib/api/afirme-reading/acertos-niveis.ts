import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import { ICA_LEVEL_NAMES } from "@/lib/api/afirme-reading/ica-results";

/**
 * Relatório Acertos e Níveis (ICA / escrita):
 * GET /afirme-reading/acertos-niveis?fonte=escrita&avaliacaoId=
 * GET /afirme-reading/acertos-niveis/filtros?fonte=escrita
 *
 * fonte=fluencia → 400 por enquanto.
 */

export type AcertosNiveisFonte = "escrita" | "fluencia";

export interface AcertosNiveisQuery {
  fonte?: AcertosNiveisFonte;
  avaliacaoId: string;
  escolaId?: string;
  serieId?: string;
  turmaId?: string;
  estudanteId?: string;
  turno?: string;
  nivel?: string;
  status?: string;
}

export interface AcertosNiveisNamedRef {
  id: string;
  nome: string;
}

export interface AcertosNiveisTurmaRef extends AcertosNiveisNamedRef {
  escolaId: string | null;
  serieId: string | null;
  turno: string | null;
}

export interface AcertosNiveisAvaliacaoRef extends AcertosNiveisNamedRef {
  titulo: string;
  status: string | null;
}

export interface AcertosNiveisFiltrosCatalog {
  avaliacoes: AcertosNiveisAvaliacaoRef[];
  escolas: AcertosNiveisNamedRef[];
  series: AcertosNiveisNamedRef[];
  turmas: AcertosNiveisTurmaRef[];
  turnos: string[];
  niveis: string[];
  status: string[];
}

export interface AcertosNiveisMeta {
  titulo: string;
  avaliacaoId: string;
  writtenTestId: string | null;
  totalItens: number | null;
  escala: string | null;
  municipio: string | null;
  estado: string | null;
  escola: string | null;
  serie: string | null;
  turma: string | null;
}

export interface AcertosNiveisQuantidade {
  quantidade: number;
  percentual: number | null;
}

export interface AcertosNiveisIndicadores {
  alunosAvaliados: number;
  turmas: number;
  mediaAcertosPercentual: number | null;
  mediaProficiencia: number | null;
  adequadoAvancado: AcertosNiveisQuantidade;
  abaixoDoBasico: AcertosNiveisQuantidade;
}

export interface AcertosNiveisAluno {
  id: string;
  nome: string;
  escola: string | null;
  serie: string | null;
  turma: string | null;
  turno: string | null;
  acertos: number | null;
  totalItens: number | null;
  percentualAcertos: number | null;
  nota: number | null;
  proficiencia: number | null;
  nivel: string | null;
  status: string | null;
}

export interface AcertosNiveisPorTurma {
  serie: string | null;
  turma: string | null;
  alunosAvaliados: number;
  mediaAcertosPercentual: number | null;
  mediaProficiencia: number | null;
  distribuicao: Record<string, AcertosNiveisQuantidade>;
  alunos: string[];
}

export interface AcertosNiveisHabilidade {
  codigo: string;
  label: string | null;
  percentualAcertos: number | null;
  faixa: string | null;
  nivel: string | null;
}

export interface AcertosNiveisRelatorio {
  fonte: AcertosNiveisFonte;
  nivelGranularidade: string | null;
  meta: AcertosNiveisMeta;
  filtrosAplicados: Record<string, string | null>;
  niveis: string[];
  indicadores: AcertosNiveisIndicadores;
  distribuicao: Record<string, AcertosNiveisQuantidade>;
  alunos: AcertosNiveisAluno[];
  porTurma: AcertosNiveisPorTurma[];
  habilidades: AcertosNiveisHabilidade[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pick(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function count(value: unknown) {
  return num(value) ?? 0;
}

function cleanQuery(params: AcertosNiveisQuery) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
}

function namedRef(value: unknown, fallbackName = "Item"): AcertosNiveisNamedRef | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = text(pick(record, "id"));
  if (!id) return null;
  return {
    id,
    nome: text(pick(record, "nome", "name", "titulo", "title"), fallbackName),
  };
}

function emptyQuantidade(): AcertosNiveisQuantidade {
  return { quantidade: 0, percentual: 0 };
}

function normalizeQuantidade(value: unknown): AcertosNiveisQuantidade {
  const record = asRecord(value);
  if (!record) {
    const n = num(value);
    return n != null ? { quantidade: n, percentual: null } : emptyQuantidade();
  }
  return {
    quantidade: count(pick(record, "quantidade", "count", "qtd")),
    percentual: num(pick(record, "percentual", "percentage", "pct")),
  };
}

function normalizeDistribuicao(value: unknown, niveis: string[]): Record<string, AcertosNiveisQuantidade> {
  const record = asRecord(value) ?? {};
  const out: Record<string, AcertosNiveisQuantidade> = {};
  const keys = niveis.length ? niveis : Object.keys(record);
  for (const key of keys) {
    out[key] = normalizeQuantidade(record[key]);
  }
  for (const [key, item] of Object.entries(record)) {
    if (!(key in out)) out[key] = normalizeQuantidade(item);
  }
  return out;
}

function normalizeAluno(value: unknown): AcertosNiveisAluno {
  const record = asRecord(value) ?? {};
  return {
    id: text(pick(record, "id", "estudanteId", "estudante_id", "studentId", "student_id")),
    nome: text(pick(record, "nome", "name", "student_name", "studentName"), "Sem nome"),
    escola: textOrNull(pick(record, "escola", "escolaNome", "escola_nome", "school_name")),
    serie: textOrNull(pick(record, "serie", "serieNome", "serie_nome", "grade_name")),
    turma: textOrNull(pick(record, "turma", "turmaNome", "turma_nome", "class_name")),
    turno: textOrNull(pick(record, "turno")),
    acertos: num(pick(record, "acertos", "pontos_34", "pontos34")),
    totalItens: num(pick(record, "total_itens", "totalItens")),
    percentualAcertos: num(pick(record, "percentual_acertos", "percentualAcertos", "nota_100")),
    nota: num(pick(record, "nota", "nota_prof_0_10", "notaProf010")),
    proficiencia: num(pick(record, "proficiencia")),
    nivel: textOrNull(pick(record, "nivel", "nivel_aprendizagem", "nivelAprendizagem")),
    status: textOrNull(pick(record, "status")),
  };
}

function normalizePorTurma(value: unknown, niveis: string[]): AcertosNiveisPorTurma {
  const record = asRecord(value) ?? {};
  const alunosRaw = pick(record, "alunos");
  const alunos = Array.isArray(alunosRaw)
    ? alunosRaw.map((item) => (typeof item === "string" ? item : text(asRecord(item)?.nome, ""))).filter(Boolean)
    : [];
  return {
    serie: textOrNull(pick(record, "serie", "serieNome", "serie_nome")),
    turma: textOrNull(pick(record, "turma", "turmaNome", "turma_nome")),
    alunosAvaliados: count(pick(record, "alunos_avaliados", "alunosAvaliados")),
    mediaAcertosPercentual: num(pick(record, "media_acertos_percentual", "mediaAcertosPercentual")),
    mediaProficiencia: num(pick(record, "media_proficiencia", "mediaProficiencia")),
    distribuicao: normalizeDistribuicao(pick(record, "distribuicao"), niveis),
    alunos,
  };
}

function normalizeHabilidade(value: unknown): AcertosNiveisHabilidade {
  const record = asRecord(value) ?? {};
  return {
    codigo: text(pick(record, "codigo", "code", "skill_code", "skillCode"), "—"),
    label: textOrNull(pick(record, "label", "nome", "skill_label", "skillLabel")),
    percentualAcertos: num(
      pick(record, "percentual_acertos", "percentualAcertos", "performance_percentage", "performancePercentage")
    ),
    faixa: textOrNull(pick(record, "faixa")),
    nivel: textOrNull(pick(record, "nivel", "nivel_aprendizagem")),
  };
}

function normalizeMeta(value: unknown, fallbackAvaliacaoId: string): AcertosNiveisMeta {
  const record = asRecord(value) ?? {};
  const avaliacaoId = text(pick(record, "avaliacao_id", "avaliacaoId"), fallbackAvaliacaoId);
  return {
    titulo: text(pick(record, "titulo", "title"), "Avaliação escrita"),
    avaliacaoId,
    writtenTestId: textOrNull(pick(record, "written_test_id", "writtenTestId")) ?? (avaliacaoId || null),
    totalItens: num(pick(record, "total_itens", "totalItens")),
    escala: textOrNull(pick(record, "escala")),
    municipio: textOrNull(pick(record, "municipio")),
    estado: textOrNull(pick(record, "estado", "uf")),
    escola: textOrNull(pick(record, "escola")),
    serie: textOrNull(pick(record, "serie")),
    turma: textOrNull(pick(record, "turma")),
  };
}

function normalizeIndicadores(value: unknown): AcertosNiveisIndicadores {
  const record = asRecord(value) ?? {};
  return {
    alunosAvaliados: count(pick(record, "alunos_avaliados", "alunosAvaliados")),
    turmas: count(pick(record, "turmas")),
    mediaAcertosPercentual: num(pick(record, "media_acertos_percentual", "mediaAcertosPercentual")),
    mediaProficiencia: num(pick(record, "media_proficiencia", "mediaProficiencia")),
    adequadoAvancado: normalizeQuantidade(pick(record, "adequado_avancado", "adequadoAvancado")),
    abaixoDoBasico: normalizeQuantidade(pick(record, "abaixo_do_basico", "abaixoDoBasico")),
  };
}

function normalizeFiltrosAplicados(value: unknown): Record<string, string | null> {
  const record = asRecord(value);
  if (!record) return {};
  const out: Record<string, string | null> = {};
  for (const [key, item] of Object.entries(record)) {
    out[key] = item == null ? null : String(item);
  }
  return out;
}

export function normalizeAcertosNiveisRelatorio(
  value: unknown,
  fallbackAvaliacaoId = ""
): AcertosNiveisRelatorio {
  const record = asRecord(value) ?? {};
  const niveisRaw = pick(record, "niveis");
  const niveis = Array.isArray(niveisRaw)
    ? niveisRaw.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [...ICA_LEVEL_NAMES];
  const alunosRaw = pick(record, "alunos");
  const porTurmaRaw = pick(record, "por_turma", "porTurma");
  const habilidadesRaw = pick(record, "habilidades");
  const fonte = text(pick(record, "fonte"), "escrita") === "fluencia" ? "fluencia" : "escrita";

  return {
    fonte,
    nivelGranularidade: textOrNull(pick(record, "nivel_granularidade", "nivelGranularidade")),
    meta: normalizeMeta(pick(record, "meta"), fallbackAvaliacaoId),
    filtrosAplicados: normalizeFiltrosAplicados(pick(record, "filtros_aplicados", "filtrosAplicados")),
    niveis,
    indicadores: normalizeIndicadores(pick(record, "indicadores")),
    distribuicao: normalizeDistribuicao(pick(record, "distribuicao"), niveis),
    alunos: Array.isArray(alunosRaw) ? alunosRaw.map(normalizeAluno) : [],
    porTurma: Array.isArray(porTurmaRaw) ? porTurmaRaw.map((item) => normalizePorTurma(item, niveis)) : [],
    habilidades: Array.isArray(habilidadesRaw) ? habilidadesRaw.map(normalizeHabilidade) : [],
  };
}

function normalizeAvaliacao(value: unknown): AcertosNiveisAvaliacaoRef | null {
  const base = namedRef(value, "Avaliação");
  if (!base) return null;
  const record = asRecord(value) ?? {};
  return {
    ...base,
    titulo: text(pick(record, "titulo", "title", "nome", "name"), base.nome),
    status: textOrNull(pick(record, "status")),
  };
}

function normalizeTurma(value: unknown): AcertosNiveisTurmaRef | null {
  const base = namedRef(value, "Turma");
  if (!base) return null;
  const record = asRecord(value) ?? {};
  return {
    ...base,
    escolaId: textOrNull(pick(record, "escolaId", "escola_id", "schoolId", "school_id")),
    serieId: textOrNull(pick(record, "serieId", "serie_id", "gradeId", "grade_id")),
    turno: textOrNull(pick(record, "turno")),
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const record = asRecord(item);
      return text(pick(record ?? {}, "id", "nome", "name", "label", "value"));
    })
    .filter(Boolean);
}

export function normalizeAcertosNiveisFiltros(value: unknown): AcertosNiveisFiltrosCatalog {
  const root = asRecord(value) ?? {};
  const record = asRecord(pick(root, "catalog", "catalogo", "data")) ?? root;
  const avaliacoesRaw = pick(record, "avaliacoes", "avaliacoesEscrita", "writtenTests");
  const escolasRaw = pick(record, "escolas", "schools");
  const seriesRaw = pick(record, "series", "grades");
  const turmasRaw = pick(record, "turmas", "classes");
  const turmas = Array.isArray(turmasRaw)
    ? turmasRaw.map(normalizeTurma).filter((item): item is AcertosNiveisTurmaRef => Boolean(item))
    : [];
  const turnosFromTurmas = Array.from(
    new Set(turmas.map((turma) => turma.turno).filter((turno): turno is string => Boolean(turno)))
  );

  return {
    avaliacoes: Array.isArray(avaliacoesRaw)
      ? avaliacoesRaw.map(normalizeAvaliacao).filter((item): item is AcertosNiveisAvaliacaoRef => Boolean(item))
      : [],
    escolas: Array.isArray(escolasRaw)
      ? escolasRaw.map((item) => namedRef(item, "Escola")).filter((item): item is AcertosNiveisNamedRef => Boolean(item))
      : [],
    series: Array.isArray(seriesRaw)
      ? seriesRaw.map((item) => namedRef(item, "Série")).filter((item): item is AcertosNiveisNamedRef => Boolean(item))
      : [],
    turmas,
    turnos: stringList(pick(record, "turnos")).length
      ? stringList(pick(record, "turnos"))
      : turnosFromTurmas,
    niveis: stringList(pick(record, "niveis")).length
      ? stringList(pick(record, "niveis"))
      : [...ICA_LEVEL_NAMES],
    status: stringList(pick(record, "status")),
  };
}

export async function getAcertosNiveisFiltros(
  fonte: AcertosNiveisFonte = "escrita",
  config?: { signal?: AbortSignal }
) {
  const { data } = await afirmeReadingApi.get<unknown>("/acertos-niveis/filtros", {
    ...config,
    params: { fonte },
  });
  return normalizeAcertosNiveisFiltros(data);
}

export async function getAcertosNiveisRelatorio(
  query: AcertosNiveisQuery,
  config?: { signal?: AbortSignal }
) {
  const params = cleanQuery({ fonte: "escrita", ...query });
  const { data } = await afirmeReadingApi.get<unknown>("/acertos-niveis", {
    ...config,
    params,
  });
  return normalizeAcertosNiveisRelatorio(data, query.avaliacaoId);
}
