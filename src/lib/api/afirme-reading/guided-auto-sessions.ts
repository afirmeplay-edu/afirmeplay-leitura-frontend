import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import { fetchGuidedAudioObjectUrl } from "@/lib/api/afirme-reading/guided-sessions";
import type {
  CreateGuidedAutoSessionPayload,
  GuidedAutoPart,
  GuidedAutoSession,
  GuidedAutoWord,
  ListGuidedAutoSessionsParams,
  SaveComprehensionAnswerItem,
} from "@/lib/api/afirme-reading/types";

/** Cria a sessão (status `awaiting_audio`). O backend calcula todas as métricas a partir do áudio. */
export async function createGuidedAutoSession(payload: CreateGuidedAutoSessionPayload) {
  const { data } = await afirmeReadingApi.post<GuidedAutoSession>("/guided-auto-sessions", payload);
  return data;
}

export async function listGuidedAutoSessions(params: ListGuidedAutoSessionsParams = {}) {
  const { data } = await afirmeReadingApi.get<GuidedAutoSession[]>("/guided-auto-sessions", { params });
  return Array.isArray(data) ? data : [];
}

export async function getGuidedAutoSession(id: string) {
  const { data } = await afirmeReadingApi.get<GuidedAutoSession>(`/guided-auto-sessions/${id}`);
  return data;
}

export async function getGuidedAutoSessionWords(id: string) {
  const { data } = await afirmeReadingApi.get<GuidedAutoWord[]>(`/guided-auto-sessions/${id}/words`);
  return Array.isArray(data) ? data : [];
}

/** Um áudio por parte; enfileira a transcrição e a correção (status `queued`). */
export async function uploadGuidedAutoAudio(
  id: string,
  part: GuidedAutoPart,
  audio: Blob,
  durationSeconds?: number
) {
  const form = new FormData();
  form.append("part", part);
  form.append("audio", audio, `${part}.webm`);
  if (durationSeconds != null && Number.isFinite(durationSeconds)) {
    form.append("durationSeconds", String(Math.max(0, Math.round(durationSeconds))));
  }
  const { data } = await afirmeReadingApi.postForm<GuidedAutoSession>(`/guided-auto-sessions/${id}/audio`, form);
  return data;
}

export async function saveGuidedAutoComprehension(id: string, answers: SaveComprehensionAnswerItem[]) {
  const { data } = await afirmeReadingApi.post<GuidedAutoSession>(`/guided-auto-sessions/${id}/comprehension-answers`, {
    answers,
  });
  return data;
}

export async function deleteGuidedAutoSession(id: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(`/guided-auto-sessions/${id}`);
  return data;
}

/** Áudio salvo de uma parte → object URL para `<audio src>` (fetch autenticado). */
export function fetchGuidedAutoAudioObjectUrl(id: string, part: GuidedAutoPart) {
  return fetchGuidedAudioObjectUrl(`/afirme-reading/guided-auto-sessions/${id}/audio?part=${encodeURIComponent(part)}`);
}
