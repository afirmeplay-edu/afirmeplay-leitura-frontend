import type {
  GuidedAutoMatchType,
  GuidedAutoPart,
  GuidedAutoSession,
  GuidedAutoStatus,
} from "@/lib/api/afirme-reading/types";

export const GUIDED_AUTO_PART_LABEL: Record<GuidedAutoPart, string> = {
  words: "Palavras conhecidas",
  uncommon: "Palavras pouco comuns",
  text: "Texto",
};

/** Ordem de leitura com o aluno (a mesma da avaliação de fluência). */
export const GUIDED_AUTO_PART_ORDER: GuidedAutoPart[] = ["words", "uncommon", "text"];

export const GUIDED_AUTO_STATUS_LABEL: Record<GuidedAutoStatus, string> = {
  awaiting_audio: "Aguardando áudio",
  queued: "Na fila",
  processing: "Processando",
  completed: "Concluída",
  failed: "Falhou",
};

export const GUIDED_AUTO_STATUS_BADGE: Record<GuidedAutoStatus, "outline" | "info" | "warning" | "success" | "destructive"> = {
  awaiting_audio: "outline",
  queued: "info",
  processing: "warning",
  completed: "success",
  failed: "destructive",
};

export const MATCH_LABEL: Record<GuidedAutoMatchType, string> = {
  correct: "Correta",
  error: "Erro",
  omitted: "Omitida",
  extra: "Inserida",
  repeat: "Repetição",
};

export const MATCH_CLASS: Record<GuidedAutoMatchType, string> = {
  correct: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  omitted: "border-slate-300 bg-slate-100 text-slate-500 line-through",
  extra: "border-amber-300 bg-amber-50 text-amber-900",
  repeat: "border-violet-300 bg-violet-50 text-violet-900",
};

export function isGuidedAutoProcessing(status: GuidedAutoStatus) {
  return status === "queued" || status === "processing";
}

/** Partes configuradas na criação (o backend não devolve o snapshot; deriva dos ids). */
export function configuredParts(
  session: Pick<GuidedAutoSession, "wordsWordListId" | "uncommonWordListId" | "readingTextId">
) {
  return GUIDED_AUTO_PART_ORDER.filter((part) =>
    part === "words"
      ? Boolean(session.wordsWordListId)
      : part === "uncommon"
        ? Boolean(session.uncommonWordListId)
        : Boolean(session.readingTextId)
  );
}

export function partHasAudio(session: Pick<GuidedAutoSession, "partAudios">, part: GuidedAutoPart) {
  return Boolean(session.partAudios && session.partAudios[part]);
}
