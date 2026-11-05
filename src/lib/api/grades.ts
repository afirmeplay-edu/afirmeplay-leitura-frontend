import { api } from "@/lib/api/client";
import type { EducationStage, Grade } from "@/lib/api/afirme-reading/types";

export async function listGrades() {
  const { data } = await api.get<Grade[]>("/grades");
  return data;
}

/** Cursos filtrados pelo escopo do usuário (só etapas com turmas/escolas). */
export async function listEducationStages() {
  const { data } = await api.get<EducationStage[]>("/education_stages");
  return data;
}

/** Catálogo completo de cursos (inclui Anos iniciais, Educação especial, etc.). */
export async function listAllEducationStages() {
  const { data } = await api.get<EducationStage[]>("/education_stages/all");
  return data;
}
