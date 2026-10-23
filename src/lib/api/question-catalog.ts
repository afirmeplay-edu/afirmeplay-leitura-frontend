import { api } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";
import { listEducationStages, listGrades } from "@/lib/api/grades";
import type { EducationStage, Grade } from "@/lib/api/afirme-reading/types";

/**
 * Catálogos do formulário de questões do ICA.
 * Disciplinas e habilidades vêm de rotas compartilhadas com o Afirme Play (`/subjects`, `/skills/...`),
 * não de `/afirme-reading`. Se o Afirme Ler ganhar rotas próprias, troque só a implementação daqui.
 */
export interface CatalogSubject {
  id: string;
  name: string;
}

export interface CatalogSkill {
  id: string;
  code: string;
  description: string;
  subjectId: string | null;
  gradeIds: string[];
}

interface RawSkill {
  id: string;
  code?: string | null;
  description?: string | null;
  subject_id?: string | null;
  grade_ids?: string[] | null;
  grade_id?: string | null;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  for (const key of ["data", "items", "results"]) {
    if (record && Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
}

function toSkill(raw: RawSkill): CatalogSkill {
  const gradeIds = raw.grade_ids?.length ? raw.grade_ids : raw.grade_id ? [raw.grade_id] : [];
  return {
    id: String(raw.id),
    code: raw.code?.trim() ?? "",
    description: raw.description?.trim() ?? "",
    subjectId: raw.subject_id ?? null,
    gradeIds,
  };
}

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const promise = load().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
}

export async function listSubjects(): Promise<CatalogSubject[]> {
  return cached("subjects", async () => {
    const { data } = await api.get("/subjects");
    return toArray<CatalogSubject>(data)
      .map((subject) => ({ id: String(subject.id), name: String(subject.name ?? "") }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  });
}

/** As rotas de habilidade respondem 404 quando não há nenhuma; aqui isso vira lista vazia. */
async function getSkills(path: string): Promise<CatalogSkill[]> {
  try {
    const { data } = await api.get(path);
    return toArray<RawSkill>(data).map(toSkill);
  } catch (error) {
    if (getApiErrorStatus(error) === 404) return [];
    throw error;
  }
}

/** Com disciplina: `/skills/subject/:id` (filtrando pela série, se houver). Só com série: `/skills/grade/:id`. */
export async function listSkills(filter: { subjectId?: string; gradeId?: string }): Promise<CatalogSkill[]> {
  const { subjectId, gradeId } = filter;
  if (subjectId) {
    const skills = await cached(`skills:subject:${subjectId}`, () => getSkills(`/skills/subject/${subjectId}`));
    return gradeId
      ? skills.filter((skill) => skill.gradeIds.length === 0 || skill.gradeIds.includes(gradeId))
      : skills;
  }
  if (gradeId) {
    return cached(`skills:grade:${gradeId}`, () => getSkills(`/skills/grade/${gradeId}`));
  }
  return [];
}

export function formatSkillLabel(skill: CatalogSkill) {
  if (skill.code && skill.description) return `${skill.code} — ${skill.description}`;
  return skill.code || skill.description || skill.id;
}

export async function listQuestionGrades(): Promise<Grade[]> {
  return listGrades();
}

export async function listQuestionEducationStages(): Promise<EducationStage[]> {
  return listEducationStages();
}
