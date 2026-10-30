import type {
  AnswerSheetWritingScore,
  ManualWritingCriteria,
} from "@/lib/api/afirme-reading/types";

/** O POST manual usa `postKey`. A leitura aceita a chave antiga em snake_case. */
export const WRITING_CRITERIA: Array<{
  postKey: keyof ManualWritingCriteria;
  readKeys: string[];
  label: string;
}> = [
  { postKey: "adequacao", readKeys: ["adequacao"], label: "Adequação" },
  { postKey: "tipologia", readKeys: ["tipologia"], label: "Tipologia" },
  { postKey: "usoPagina", readKeys: ["usoPagina", "uso_pagina"], label: "Uso da página" },
  { postKey: "ortografia", readKeys: ["ortografia"], label: "Ortografia" },
  { postKey: "pontuacao", readKeys: ["pontuacao"], label: "Pontuação" },
  { postKey: "coesao", readKeys: ["coesao"], label: "Coesão" },
  { postKey: "segmentacao", readKeys: ["segmentacao"], label: "Segmentação" },
];

export function criterionScore(criteria: Record<string, number | null> | null | undefined, readKeys: string[]) {
  if (!criteria) return null;
  for (const key of readKeys) {
    const value = criteria[key];
    if (typeof value === "number") return value;
  }
  return null;
}

export function writingItemHasScore(item: { points: number | null; status: string } | null | undefined) {
  return Boolean(item) && item!.points != null && item!.status !== "PENDENTE";
}

/** As questões 17, 18 e 19 precisam de nota, e o resultado ainda não foi publicado. */
export function canReleaseWriting(writing: AnswerSheetWritingScore) {
  if (writing.published) return false;
  const words = new Map(writing.words.map((word) => [word.number, word]));
  return (
    writingItemHasScore(words.get(17)) &&
    writingItemHasScore(words.get(18)) &&
    writingItemHasScore(writing.production)
  );
}
