import axios from "axios";
import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";

/**
 * Painel do ICA na branch dev do backend:
 * GET /afirme-reading/written-tests/{id}/ica-dashboard
 * GET /afirme-reading/written-tests/{id}/skill-map
 * GET /afirme-reading/written-tests/{id}/results.csv
 * A conta (publicação, uma casa, matrícula e SEM_DADOS) fica no servidor.
 */

export type IcaScopeLevel = "municipio" | "escola" | "serie" | "turma" | "aluno";
export type IcaRowLevel = "escola" | "serie" | "turma" | "aluno";

export interface IcaDashboardQuery {
  escolaId?: string;
  serieId?: string;
  turmaId?: string;
  estudanteId?: string;
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

export interface IcaProficiencyInep {
  imported_valid: number;
  ica_percentage: number | null;
  status: string;
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
  expected: number | null;
  evaluated_diagnostic: number | null;
  percentage: number | null;
  apt: number | boolean | null;
  iad_percentage: number | null;
  score: number | null;
  reading: number | null;
  words: number | null;
  text: number | null;
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
  score: number | null;
  apt: boolean;
  items: IcaStudentItem[];
}

export interface IcaDashboard {
  writtenTestId: string;
  title: string;
  scope: IcaDashboardScope;
  participation: IcaParticipation;
  diagnostic: IcaDiagnostic;
  proficiency_inep: IcaProficiencyInep;
  rows: IcaDashboardRow[];
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
  return {
    id,
    name: text(pick(record, "name", "student_name", "studentName"), "Sem nome"),
    rowLevel: level,
    escolaId: textOrNull(pick(record, "escolaId", "escola_id")) ?? (level === "escola" ? id : null),
    serieId: textOrNull(pick(record, "serieId", "serie_id")) ?? (level === "serie" ? id : null),
    turmaId: textOrNull(pick(record, "turmaId", "turma_id")) ?? (level === "turma" ? id : classId),
    studentId: studentId ?? (level === "aluno" ? id : null),
    classId,
    className: textOrNull(pick(record, "className", "class_name")),
    expected: num(pick(record, "expected")),
    evaluated_diagnostic: num(pick(record, "evaluated_diagnostic", "evaluatedDiagnostic")),
    percentage: num(pick(record, "percentage")),
    apt: aptValue(pick(record, "apt")),
    iad_percentage: num(pick(record, "iad_percentage", "iadPercentage")),
    score: num(pick(record, "score")),
    reading: num(pick(record, "reading")),
    words: num(pick(record, "words")),
    text: num(pick(record, "text")),
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
  return {
    student_id: text(pick(record, "student_id", "studentId")),
    student_name: text(pick(record, "student_name", "studentName", "name"), "Aluno"),
    finalized: pick(record, "finalized") === true,
    class_name: textOrNull(pick(record, "class_name", "className")),
    serie_name: textOrNull(pick(record, "serie_name", "serieName")),
    school_name: textOrNull(pick(record, "school_name", "schoolName")),
    reading: num(pick(record, "reading")),
    words: num(pick(record, "words")),
    text: num(pick(record, "text")),
    score: num(pick(record, "score")),
    apt: pick(record, "apt") === true,
    items: Array.isArray(items) ? items.map(normalizeItem) : [],
  };
}

function normalizeDashboard(value: unknown): IcaDashboard {
  const record = asRecord(value) ?? {};
  const participation = asRecord(pick(record, "participation")) ?? {};
  const diagnostic = asRecord(pick(record, "diagnostic")) ?? {};
  const proficiency = asRecord(pick(record, "proficiency_inep", "proficiencyInep")) ?? {};
  const rows = pick(record, "rows");
  return {
    writtenTestId: text(pick(record, "writtenTestId", "written_test_id")),
    title: text(pick(record, "title"), "Avaliação"),
    scope: normalizeScope(pick(record, "scope")),
    participation: {
      expected: count(pick(participation, "expected")),
      evaluated_diagnostic: count(pick(participation, "evaluated_diagnostic", "evaluatedDiagnostic")),
      percentage: num(pick(participation, "percentage")),
    },
    diagnostic: {
      valid: count(pick(diagnostic, "valid")),
      apt: count(pick(diagnostic, "apt")),
      iad_percentage: num(pick(diagnostic, "iad_percentage", "iadPercentage")),
    },
    proficiency_inep: {
      imported_valid: count(pick(proficiency, "imported_valid", "importedValid")),
      ica_percentage: num(pick(proficiency, "ica_percentage", "icaPercentage")),
      status: text(pick(proficiency, "status"), "SEM_DADOS"),
    },
    rows: Array.isArray(rows) ? rows.map(normalizeRow) : [],
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
