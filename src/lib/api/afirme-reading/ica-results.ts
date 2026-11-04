import axios from "axios";
import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";

/**
 * Painel do ICA:
 * GET /afirme-reading/written-tests/{id}/ica-dashboard
 * GET /afirme-reading/written-tests/{id}/skill-map
 * GET /afirme-reading/written-tests/{id}/results.csv
 *
 * Proficiência, notas, nível e status saem da correção finalizada.
 * O painel só exibe o que o backend já calculou.
 */

export type IcaScopeLevel = "municipio" | "escola" | "serie" | "turma" | "aluno";
export type IcaRowLevel = "escola" | "serie" | "turma" | "aluno";

export const ICA_LEVEL_NAMES = [
  "Abaixo do Básico",
  "Básico",
  "Adequado",
  "Avançado",
] as const;

export const ICA_STATUS_VALUES = ["Alfabetizado", "Não alfabetizado", "Não avaliado"] as const;

export type IcaLearningLevel = (typeof ICA_LEVEL_NAMES)[number];
export type IcaStudentStatus = (typeof ICA_STATUS_VALUES)[number];

export interface IcaDashboardQuery {
  escolaId?: string;
  serieId?: string;
  turmaId?: string;
  estudanteId?: string;
  status?: string;
  nivel?: string;
  q?: string;
}

export interface IcaDashboardScope {
  level: IcaScopeLevel;
  escolaId: string | null;
  escolaName: string | null;
  serieId: string | null;
  serieName: string | null;
  turmaId: string | null;
  turmaName: string | null;
  estudanteId: string | null;
  estudanteName: string | null;
}

export interface IcaParticipation {
  expected: number;
  evaluated_diagnostic: number;
  percentage: number | null;
}

export interface IcaDiagnostic {
  valid: number;
  apt: number;
  iad_percentage: number | null;
}

export interface IcaKpis {
  previstos: number;
  avaliados: number;
  participacao_percentual: number | null;
  alfabetizados: number;
  nao_alfabetizados: number;
  sem_proficiencia: number;
  percentual_ge_743: number | null;
  proficiencia_media: number | null;
  nota_prof_media: number | null;
  nota_tct_media: number | null;
}

export interface IcaNivelItem {
  name: string;
  count: number;
  percentage: number | null;
}

export interface IcaNiveis {
  validos: number;
  items: IcaNivelItem[];
}

export interface IcaDashboardRow {
  id: string;
  name: string;
  rowLevel: IcaRowLevel;
  escolaId: string | null;
  serieId: string | null;
  turmaId: string | null;
  studentId: string | null;
  classId: string | null;
  className: string | null;
  serieName: string | null;
  schoolName: string | null;
  municipio: string | null;
  expected: number | null;
  evaluated_diagnostic: number | null;
  percentage: number | null;
  previstos: number | null;
  avaliados: number | null;
  participacao_percentual: number | null;
  alfabetizados: number | null;
  nao_alfabetizados: number | null;
  sem_proficiencia: number | null;
  percentual_ge_743: number | null;
  niveis: Record<string, number> | null;
  nota_tct_media: number | null;
  nota_prof_media: number | null;
  proficiencia_media: number | null;
  apt: number | boolean | null;
  iad_percentage: number | null;
  score: number | null;
  reading: number | null;
  words: number | null;
  text: number | null;
  pontos_34: number | null;
  nota_tct_0_10: number | null;
  nota_prof_0_10: number | null;
  nota_prof_exata: number | null;
  proficiencia: number | null;
  nivel_aprendizagem: string | null;
  status: string | null;
  avaliado: boolean | null;
  finalized: boolean | null;
  apto_diagnostico: boolean | null;
}

export interface IcaStudentItem {
  number: number | null;
  code: string | null;
  points: number | null;
  max_points: number | null;
  skill_code: string | null;
  skill_label: string | null;
}

export interface IcaDashboardStudent {
  student_id: string;
  student_name: string;
  finalized: boolean;
  class_name: string | null;
  serie_name: string | null;
  school_name: string | null;
  reading: number | null;
  words: number | null;
  text: number | null;
  pontos_34: number | null;
  score: number | null;
  nota_tct_0_10: number | null;
  nota_prof_0_10: number | null;
  nota_prof_exata: number | null;
  proficiencia: number | null;
  nivel_aprendizagem: string | null;
  status: string | null;
  avaliado: boolean;
  apt: boolean;
  apto_diagnostico: boolean;
  items: IcaStudentItem[];
}

export interface IcaDashboard {
  writtenTestId: string;
  title: string;
  municipio: string | null;
  uf: string | null;
  scope: IcaDashboardScope;
  kpis: IcaKpis;
  niveis: IcaNiveis;
  participation: IcaParticipation;
  diagnostic: IcaDiagnostic;
  rows: IcaDashboardRow[];
  students: IcaDashboardRow[];
  student: IcaDashboardStudent | null;
}

export interface IcaSkill {
  skill_code: string;
  skill_label: string;
  items: string[];
  max_points_student: number | null;
  relative_weight_percentage: number | null;
  performance_percentage: number | null;
}

export interface IcaSkillMap {
  writtenTestId: string;
  scope: IcaDashboardScope;
  max_points: number | null;
  valid_attempts: number;
  skills: IcaSkill[];
}

function clean(params: IcaDashboardQuery) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
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

function boolOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function scopeLevel(value: unknown): IcaScopeLevel {
  if (value === "escola" || value === "serie" || value === "turma" || value === "aluno") return value;
  return "municipio";
}

function rowLevel(value: unknown): IcaRowLevel {
  if (value === "escola" || value === "serie" || value === "turma" || value === "aluno") return value;
  return "escola";
}

function aptValue(value: unknown): number | boolean | null {
  if (typeof value === "boolean") return value;
  return num(value);
}

function normalizeLevelCounts(value: unknown): Record<string, number> | null {
  const record = asRecord(value);
  if (!record) return null;
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(record)) {
    const n = num(item);
    if (n != null) out[key] = n;
  }
  return out;
}

function normalizeScope(value: unknown): IcaDashboardScope {
  const record = asRecord(value) ?? {};
  return {
    level: scopeLevel(pick(record, "level")),
    escolaId: textOrNull(pick(record, "escolaId", "escola_id")),
    escolaName: textOrNull(pick(record, "escolaName", "escola_name")),
    serieId: textOrNull(pick(record, "serieId", "serie_id")),
    serieName: textOrNull(pick(record, "serieName", "serie_name")),
    turmaId: textOrNull(pick(record, "turmaId", "turma_id")),
    turmaName: textOrNull(pick(record, "turmaName", "turma_name")),
    estudanteId: textOrNull(pick(record, "estudanteId", "estudante_id")),
    estudanteName: textOrNull(pick(record, "estudanteName", "estudante_name")),
  };
}

function normalizeRow(value: unknown): IcaDashboardRow {
  const record = asRecord(value) ?? {};
  const level = rowLevel(pick(record, "rowLevel", "row_level"));
  const studentId = textOrNull(pick(record, "studentId", "student_id"));
  const classId = textOrNull(pick(record, "classId", "class_id", "turmaId", "turma_id"));
  const id = text(pick(record, "id", "student_id", "studentId"));
  const name = text(
    pick(record, "name", "aluno", "student_name", "studentName"),
    "Sem nome"
  );
  const reading = num(pick(record, "reading", "leitura_16"));
  const words = num(pick(record, "words", "palavras_4"));
  const textScore = num(pick(record, "text", "texto_14"));
  const apt = aptValue(pick(record, "apt", "apto_diagnostico"));
  return {
    id,
    name,
    rowLevel: level,
    escolaId: textOrNull(pick(record, "escolaId", "escola_id", "school_id")) ?? (level === "escola" ? id : null),
    serieId: textOrNull(pick(record, "serieId", "serie_id")) ?? (level === "serie" ? id : null),
    turmaId: textOrNull(pick(record, "turmaId", "turma_id")) ?? (level === "turma" ? id : classId),
    studentId: studentId ?? (level === "aluno" ? id : null),
    classId,
    className: textOrNull(pick(record, "className", "class_name", "turma")),
    serieName: textOrNull(pick(record, "serieName", "serie_name", "serie")),
    schoolName: textOrNull(pick(record, "schoolName", "school_name", "escola")),
    municipio: textOrNull(pick(record, "municipio")),
    expected: num(pick(record, "expected", "previstos")),
    evaluated_diagnostic: num(pick(record, "evaluated_diagnostic", "evaluatedDiagnostic", "avaliados")),
    percentage: num(pick(record, "percentage", "participacao_percentual")),
    previstos: num(pick(record, "previstos", "expected")),
    avaliados: num(pick(record, "avaliados", "evaluated_diagnostic", "evaluatedDiagnostic")),
    participacao_percentual: num(pick(record, "participacao_percentual", "percentage")),
    alfabetizados: num(pick(record, "alfabetizados")),
    nao_alfabetizados: num(pick(record, "nao_alfabetizados")),
    sem_proficiencia: num(pick(record, "sem_proficiencia")),
    percentual_ge_743: num(pick(record, "percentual_ge_743")),
    niveis: normalizeLevelCounts(pick(record, "niveis")),
    nota_tct_media: num(pick(record, "nota_tct_media")),
    nota_prof_media: num(pick(record, "nota_prof_media")),
    proficiencia_media: num(pick(record, "proficiencia_media")),
    apt,
    iad_percentage: num(pick(record, "iad_percentage", "iadPercentage")),
    score: num(pick(record, "score", "nota_100")),
    reading,
    words,
    text: textScore,
    pontos_34: num(pick(record, "pontos_34")),
    nota_tct_0_10: num(pick(record, "nota_tct_0_10")),
    nota_prof_0_10: num(pick(record, "nota_prof_0_10")),
    nota_prof_exata: num(pick(record, "nota_prof_exata")),
    proficiencia: num(pick(record, "proficiencia")),
    nivel_aprendizagem: textOrNull(pick(record, "nivel_aprendizagem")),
    status: textOrNull(pick(record, "status")),
    avaliado: boolOrNull(pick(record, "avaliado")),
    finalized: boolOrNull(pick(record, "finalized")),
    apto_diagnostico: typeof apt === "boolean" ? apt : boolOrNull(pick(record, "apto_diagnostico")),
  };
}

function normalizeItem(value: unknown): IcaStudentItem {
  const record = asRecord(value) ?? {};
  return {
    number: num(pick(record, "number")),
    code: textOrNull(pick(record, "code")),
    points: num(pick(record, "points")),
    max_points: num(pick(record, "max_points", "maxPoints")),
    skill_code: textOrNull(pick(record, "skill_code", "skillCode")),
    skill_label: textOrNull(pick(record, "skill_label", "skillLabel")),
  };
}

function normalizeStudent(value: unknown): IcaDashboardStudent | null {
  const record = asRecord(value);
  if (!record) return null;
  const items = pick(record, "items");
  const reading = num(pick(record, "reading", "leitura_16"));
  const words = num(pick(record, "words", "palavras_4"));
  const textScore = num(pick(record, "text", "texto_14"));
  const apt = pick(record, "apt", "apto_diagnostico") === true;
  return {
    student_id: text(pick(record, "student_id", "studentId", "id")),
    student_name: text(pick(record, "student_name", "studentName", "aluno", "name"), "Aluno"),
    finalized: pick(record, "finalized") === true,
    class_name: textOrNull(pick(record, "class_name", "className", "turma")),
    serie_name: textOrNull(pick(record, "serie_name", "serieName", "serie")),
    school_name: textOrNull(pick(record, "school_name", "schoolName", "escola")),
    reading,
    words,
    text: textScore,
    pontos_34: num(pick(record, "pontos_34")),
    score: num(pick(record, "score", "nota_100")),
    nota_tct_0_10: num(pick(record, "nota_tct_0_10")),
    nota_prof_0_10: num(pick(record, "nota_prof_0_10")),
    nota_prof_exata: num(pick(record, "nota_prof_exata")),
    proficiencia: num(pick(record, "proficiencia")),
    nivel_aprendizagem: textOrNull(pick(record, "nivel_aprendizagem")),
    status: textOrNull(pick(record, "status")),
    avaliado: pick(record, "avaliado") === true,
    apt,
    apto_diagnostico: apt,
    items: Array.isArray(items) ? items.map(normalizeItem) : [],
  };
}

function normalizeKpis(value: unknown, participation: IcaParticipation): IcaKpis {
  const record = asRecord(value) ?? {};
  return {
    previstos: num(pick(record, "previstos")) ?? participation.expected,
    avaliados: num(pick(record, "avaliados")) ?? participation.evaluated_diagnostic,
    participacao_percentual: num(pick(record, "participacao_percentual")) ?? participation.percentage,
    alfabetizados: count(pick(record, "alfabetizados")),
    nao_alfabetizados: count(pick(record, "nao_alfabetizados")),
    sem_proficiencia: count(pick(record, "sem_proficiencia")),
    percentual_ge_743: num(pick(record, "percentual_ge_743")),
    proficiencia_media: num(pick(record, "proficiencia_media")),
    nota_prof_media: num(pick(record, "nota_prof_media")),
    nota_tct_media: num(pick(record, "nota_tct_media")),
  };
}

function normalizeNiveis(value: unknown): IcaNiveis {
  const record = asRecord(value) ?? {};
  const itemsRaw = pick(record, "items");
  const items: IcaNivelItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) => {
        const row = asRecord(item) ?? {};
        return {
          name: text(pick(row, "name"), "Nível"),
          count: count(pick(row, "count")),
          percentage: num(pick(row, "percentage")),
        };
      })
    : ICA_LEVEL_NAMES.map((name) => ({ name, count: 0, percentage: 0 }));
  return {
    validos: count(pick(record, "validos")),
    items,
  };
}

function normalizeDashboard(value: unknown): IcaDashboard {
  const record = asRecord(value) ?? {};
  const participationRaw = asRecord(pick(record, "participation")) ?? {};
  const diagnosticRaw = asRecord(pick(record, "diagnostic")) ?? {};
  const rows = pick(record, "rows");
  const students = pick(record, "students");
  const participation: IcaParticipation = {
    expected: count(pick(participationRaw, "expected")),
    evaluated_diagnostic: count(pick(participationRaw, "evaluated_diagnostic", "evaluatedDiagnostic")),
    percentage: num(pick(participationRaw, "percentage")),
  };
  const diagnostic: IcaDiagnostic = {
    valid: count(pick(diagnosticRaw, "valid")),
    apt: count(pick(diagnosticRaw, "apt")),
    iad_percentage: num(pick(diagnosticRaw, "iad_percentage", "iadPercentage")),
  };
  return {
    writtenTestId: text(pick(record, "writtenTestId", "written_test_id")),
    title: text(pick(record, "title"), "Avaliação"),
    municipio: textOrNull(pick(record, "municipio")),
    uf: textOrNull(pick(record, "uf")),
    scope: normalizeScope(pick(record, "scope")),
    kpis: normalizeKpis(pick(record, "kpis"), participation),
    niveis: normalizeNiveis(pick(record, "niveis")),
    participation,
    diagnostic,
    rows: Array.isArray(rows) ? rows.map(normalizeRow) : [],
    students: Array.isArray(students) ? students.map(normalizeRow) : [],
    student: normalizeStudent(pick(record, "student")),
  };
}

function normalizeSkill(value: unknown): IcaSkill {
  const record = asRecord(value) ?? {};
  const items = pick(record, "items");
  return {
    skill_code: text(pick(record, "skill_code", "skillCode")),
    skill_label: text(pick(record, "skill_label", "skillLabel"), "Habilidade"),
    items: Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [],
    max_points_student: num(pick(record, "max_points_student", "maxPointsStudent")),
    relative_weight_percentage: num(pick(record, "relative_weight_percentage", "relativeWeightPercentage")),
    performance_percentage: num(pick(record, "performance_percentage", "performancePercentage")),
  };
}

function normalizeSkillMap(value: unknown): IcaSkillMap {
  const record = asRecord(value) ?? {};
  const skills = pick(record, "skills");
  return {
    writtenTestId: text(pick(record, "writtenTestId", "written_test_id")),
    scope: normalizeScope(pick(record, "scope")),
    max_points: num(pick(record, "max_points", "maxPoints")),
    valid_attempts: count(pick(record, "valid_attempts", "validAttempts")),
    skills: Array.isArray(skills) ? skills.map(normalizeSkill) : [],
  };
}

export async function getIcaDashboard(
  writtenTestId: string,
  query: IcaDashboardQuery = {},
  config?: { signal?: AbortSignal }
) {
  const { data } = await afirmeReadingApi.get<unknown>(`/written-tests/${writtenTestId}/ica-dashboard`, {
    ...config,
    params: clean(query),
  });
  return normalizeDashboard(data);
}

export async function getIcaSkillMap(
  writtenTestId: string,
  query: IcaDashboardQuery = {},
  config?: { signal?: AbortSignal }
) {
  const { data } = await afirmeReadingApi.get<unknown>(`/written-tests/${writtenTestId}/skill-map`, {
    ...config,
    params: clean(query),
  });
  return normalizeSkillMap(data);
}

async function blobErrorToJson(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await error.response.data.text());
    } catch {
      /* mantém o corpo original */
    }
  }
  return error;
}

function filenameFromDisposition(header: unknown, fallback: string) {
  if (typeof header !== "string") return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* usa o nome simples */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? fallback;
}

export async function downloadIcaResultsCsv(writtenTestId: string, query: IcaDashboardQuery = {}) {
  try {
    const response = await afirmeReadingApi.get<Blob>(`/written-tests/${writtenTestId}/results.csv`, {
      params: clean(query),
      responseType: "blob",
    });
    const filename = filenameFromDisposition(response.headers?.["content-disposition"], "resultados_ica.csv");
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    throw await blobErrorToJson(error);
  }
}
