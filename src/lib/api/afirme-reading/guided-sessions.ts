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
    const value = audioUrl.trim();
    if (!value) return value;
    if (value.startsWith("/api/")) return value;
    if (value.startsWith("/")) return `/api${value}`;

    // URL absoluta com esquema.
    if (/^https?:\/\//i.test(value)) {
      return `/api${new URL(value).pathname}`;
    }

    // host:porta/path sem esquema (ex.: localhost:5000/afirme-reading/...).
    // new URL("localhost:5000/...") trata "localhost" como protocolo — forçamos http://.
    try {
      const pathname = new URL(`http://${value}`).pathname;
      if (pathname && pathname !== "/") return `/api${pathname}`;
    } catch {
      // fall through
    }

    const slash = value.indexOf("/");
    if (slash >= 0) {
      const path = value.slice(slash);
      if (path.startsWith("/")) return `/api${path}`;
    }

    return value;
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

/** Resolve URL de áudio da sessão (path canônico por id; evita audioUrl com host malformado). */
export function resolveGuidedSessionAudioUrl(session: Pick<GuidedSession, "id" | "audioUrl" | "hasAudio">) {
  if (session.hasAudio || session.audioUrl) {
    return `/afirme-reading/guided-sessions/${session.id}/audio`;
  }
  return null;
}
