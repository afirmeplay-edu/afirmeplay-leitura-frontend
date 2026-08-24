import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import { fetchGuidedAudioObjectUrl } from "@/lib/api/afirme-reading/guided-sessions";
import type {
  CreateFluencySessionPayload,
  FluencyAudioPart,
  FluencySession,
  FluencySessionReport,
  SaveComprehensionAnswersPayload,
  SaveFluencyPayload,
} from "@/lib/api/afirme-reading/types";

/** Cria a sessão oficial (evaluationId + studentId) ou a sessão livre de prática. */
export async function createFluencySession(payload: CreateFluencySessionPayload) {
  const body = payload.evaluationId
    ? { evaluationId: payload.evaluationId, studentId: payload.studentId }
    : payload;
  const { data } = await afirmeReadingApi.post<FluencySession>("/fluency-sessions", body);
  return data;
}

/** GET /fluency-sessions/:id */
export async function getFluencySession(id: string) {
  const { data } = await afirmeReadingApi.get<FluencySession>(`/fluency-sessions/${id}`);
  return data;
}

/** PATCH /fluency-sessions/:id/fluency — incremental (só a parte concluída). */
export async function saveFluencySessionPart(id: string, payload: SaveFluencyPayload) {
  const { data } = await afirmeReadingApi.patch<FluencySession>(
    `/fluency-sessions/${id}/fluency`,
    payload
  );
  return data;
}

/** POST /fluency-sessions/:id/audio */
export async function uploadFluencySessionAudio(
  id: string,
  part: FluencyAudioPart,
  blob: Blob,
  filename = `${part}.webm`
) {
  const form = new FormData();
  form.append("part", part);
  form.append("audio", blob, filename);
  const { data } = await afirmeReadingApi.postForm<FluencySession>(
    `/fluency-sessions/${id}/audio`,
    form
  );
  return data;
}

/** Path canônico para stream autenticado do áudio da parte. */
export function fluencySessionAudioPath(id: string, part: FluencyAudioPart) {
  return `/afirme-reading/fluency-sessions/${id}/audio?part=${part}`;
}

/** Fetch autenticado (JWT + cidade) → object URL para `<audio src>`. */
export async function fetchFluencyAudioObjectUrl(id: string, part: FluencyAudioPart) {
  return fetchGuidedAudioObjectUrl(fluencySessionAudioPath(id, part));
}

/** POST /fluency-sessions/:id/comprehension-answers */
export async function saveFluencyComprehensionAnswers(
  id: string,
  payload: SaveComprehensionAnswersPayload
) {
  const { data } = await afirmeReadingApi.post<FluencySession>(
    `/fluency-sessions/${id}/comprehension-answers`,
    payload
  );
  return data;
}

/** GET /fluency-sessions/:id/report */
export async function getFluencySessionReport(id: string) {
  const { data } = await afirmeReadingApi.get<FluencySessionReport>(
    `/fluency-sessions/${id}/report`
  );
  return data;
}

/** POST /fluency-sessions/:id/submit */
export async function submitFluencySession(id: string) {
  const { data } = await afirmeReadingApi.post<FluencySession>(
    `/fluency-sessions/${id}/submit`
  );
  return data;
}
