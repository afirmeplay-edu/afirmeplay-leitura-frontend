import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  ListReadingEvaluationsParams,
  ReadingEvaluation,
  ReadingEvaluationSession,
} from "@/lib/api/afirme-reading/types";

/** GET /evaluations */
export async function listEvaluations(params?: ListReadingEvaluationsParams) {
  const { data } = await afirmeReadingApi.get<ReadingEvaluation[]>("/evaluations", {
    params: {
      status: params?.status,
      assessmentType: params?.assessmentType,
    },
  });
  return data;
}

/** GET /evaluations/:evaluationId */
export async function getEvaluation(evaluationId: string, includeSessions = false) {
  const { data } = await afirmeReadingApi.get<ReadingEvaluation>(
    `/evaluations/${evaluationId}`,
    {
      params: includeSessions ? { includeSessions: "true" } : undefined,
    }
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
