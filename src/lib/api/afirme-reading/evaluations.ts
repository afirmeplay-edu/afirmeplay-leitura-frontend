import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  CreateReadingEvaluationPayload,
  EvaluationApplicants,
  ListReadingEvaluationsParams,
  ReadingEvaluation,
  ReadingEvaluationSession,
  UpdateReadingEvaluationPayload,
} from "@/lib/api/afirme-reading/types";

/** POST /evaluations */
export async function createEvaluation(payload: CreateReadingEvaluationPayload) {
  const { data } = await afirmeReadingApi.post<ReadingEvaluation>("/evaluations", payload);
  return data;
}

/** GET /evaluations */
export async function listEvaluations(params?: ListReadingEvaluationsParams) {
  const { data } = await afirmeReadingApi.get<ReadingEvaluation[] | { data?: ReadingEvaluation[]; items?: ReadingEvaluation[] }>(
    "/evaluations",
    {
      params: {
        status: params?.status,
        evaluationKind: params?.evaluationKind,
      },
    }
  );
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
  }
  return [];
}

/** GET /evaluations/:evaluationId — ficha com texto, listas e scope */
export async function getEvaluation(evaluationId: string, includeSessions = false) {
  const { data } = await afirmeReadingApi.get<ReadingEvaluation>(
    `/evaluations/${evaluationId}`,
    {
      params: includeSessions ? { includeSessions: "true" } : undefined,
    }
  );
  return data;
}

/** PATCH /evaluations/:evaluationId — só o criador */
export async function updateEvaluation(
  evaluationId: string,
  payload: UpdateReadingEvaluationPayload
) {
  const { data } = await afirmeReadingApi.patch<ReadingEvaluation>(
    `/evaluations/${evaluationId}`,
    payload
  );
  return data;
}

/** DELETE /evaluations/:evaluationId — criador ou admin/tecadm */
export async function deleteEvaluation(evaluationId: string) {
  const { data } = await afirmeReadingApi.delete<{ message?: string }>(
    `/evaluations/${evaluationId}`
  );
  return data;
}

/** GET /evaluations/:evaluationId/sessions */
export async function listReadingSessions(evaluationId: string) {
  const { data } = await afirmeReadingApi.get<ReadingEvaluationSession[]>(
    `/evaluations/${evaluationId}/sessions`
  );
  return data;
}

/** GET /evaluations/:evaluationId/applicants — turmas do escopo + alunos e flags. */
export async function getEvaluationApplicants(evaluationId: string) {
  const { data } = await afirmeReadingApi.get<EvaluationApplicants>(
    `/evaluations/${evaluationId}/applicants`
  );
  return data;
}
