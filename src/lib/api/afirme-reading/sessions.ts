import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  FluencySessionReport,
  ReadingEvaluationSession,
  SaveComprehensionAnswersPayload,
  SaveFluencyPayload,
} from "@/lib/api/afirme-reading/types";

/** POST /evaluations/:evaluationId/sessions/:sessionId/start */
export async function startReadingSession(evaluationId: string, sessionId: string) {
  const { data } = await afirmeReadingApi.post<ReadingEvaluationSession>(
    `/evaluations/${evaluationId}/sessions/${sessionId}/start`
  );
  return data;
}

/** PATCH /evaluations/:evaluationId/sessions/:sessionId/fluency */
export async function saveFluency(
  evaluationId: string,
  sessionId: string,
  payload: SaveFluencyPayload
) {
  const { data } = await afirmeReadingApi.patch<ReadingEvaluationSession>(
    `/evaluations/${evaluationId}/sessions/${sessionId}/fluency`,
    payload
  );
  return data;
}

/** POST /evaluations/:evaluationId/sessions/:sessionId/comprehension-answers */
export async function saveComprehensionAnswers(
  evaluationId: string,
  sessionId: string,
  payload: SaveComprehensionAnswersPayload
) {
  const { data } = await afirmeReadingApi.post<ReadingEvaluationSession>(
    `/evaluations/${evaluationId}/sessions/${sessionId}/comprehension-answers`,
    payload
  );
  return data;
}

/** GET /evaluations/:evaluationId/sessions/:sessionId/report */
export async function getReport(evaluationId: string, sessionId: string) {
  const { data } = await afirmeReadingApi.get<FluencySessionReport>(
    `/evaluations/${evaluationId}/sessions/${sessionId}/report`
  );
  return data;
}

/** POST /evaluations/:evaluationId/sessions/:sessionId/submit */
export async function submitSession(evaluationId: string, sessionId: string) {
  const { data } = await afirmeReadingApi.post<ReadingEvaluationSession>(
    `/evaluations/${evaluationId}/sessions/${sessionId}/submit`
  );
  return data;
}
