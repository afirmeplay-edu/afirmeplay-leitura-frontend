import { api } from "@/lib/api/client";
import type { EducationStage, Grade } from "@/lib/api/afirme-reading/types";

export async function listGrades() {
  const { data } = await api.get<Grade[]>("/grades");
  return data;
}

export async function listEducationStages() {
  const { data } = await api.get<EducationStage[]>("/education_stages");
  return data;
}
