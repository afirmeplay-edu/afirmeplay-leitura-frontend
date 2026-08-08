import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import { getCityContextHeaders } from "@/lib/city-domain";
import type {
  CreateGuidedSessionPayload,
  GuidedSession,
  ListGuidedSessionsParams,
} from "@/lib/api/afirme-reading/types";

export async function createGuidedSession(payload: CreateGuidedSessionPayload) {
  const { data } = await afirmeReadingApi.post<GuidedSession>("/guided-sessions", payload);
  return data;
}

export async function listGuidedSessions(params?: ListGuidedSessionsParams) {
  const { data } = await afirmeReadingApi.get<GuidedSession[]>("/guided-sessions", {
    params,
  });
  return data;
}

export async function getGuidedSession(id: string) {
  const { data } = await afirmeReadingApi.get<GuidedSession>(`/guided-sessions/${id}`);
  return data;
}

export async function uploadGuidedSessionAudio(id: string, blob: Blob, filename = "leitura.webm") {
  const form = new FormData();
  form.append("audio", blob, filename);
  const { data } = await afirmeReadingApi.postForm<GuidedSession>(
    `/guided-sessions/${id}/audio`,
    form
  );
  return data;
}

export async function deleteGuidedSession(id: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(`/guided-sessions/${id}`);
  return data;
}

/** Converte audioUrl absoluto do backend para path via proxy Next `/api`. */
export function toProxiedAudioUrl(audioUrl: string) {
  try {
    if (audioUrl.startsWith("/api/")) return audioUrl;
    if (audioUrl.startsWith("/")) return `/api${audioUrl}`;
    const pathname = new URL(audioUrl).pathname;
    return `/api${pathname}`;
  } catch {
    return audioUrl;
  }
}

/** Fetch autenticado do áudio → object URL para `<audio src>`. */
export async function fetchGuidedAudioObjectUrl(audioUrl: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) throw new Error("Sessao sem token.");

  const res = await fetch(toProxiedAudioUrl(audioUrl), {
    headers: {
      Authorization: `Bearer ${token}`,
      ...getCityContextHeaders(),
    },
  });
  if (res.status === 401) {
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.getState().logout();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.replace("/login");
    }
    throw new Error("Sessao expirada.");
  }
  if (!res.ok) throw new Error("Falha ao baixar audio.");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Resolve URL de áudio da sessão (campo audioUrl ou path padrão por id). */
export function resolveGuidedSessionAudioUrl(session: Pick<GuidedSession, "id" | "audioUrl" | "hasAudio">) {
  if (session.audioUrl) return session.audioUrl;
  if (session.hasAudio) return `/afirme-reading/guided-sessions/${session.id}/audio`;
  return null;
}
