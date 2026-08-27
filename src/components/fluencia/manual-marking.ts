export type TextWordMark = "unmarked" | "acertou" | "errou" | "soletrou";

export type SentenceStatus = "pending" | "all_correct" | "partial" | "mostly_wrong";

const SENTENCE_END = /[.!?…]+["»”')\]]*$/;

export function tokenEndsSentence(display: string): boolean {
  return SENTENCE_END.test(display.trim());
}

export function assignSentenceIndices(displays: readonly string[]): number[] {
  const indices: number[] = [];
  let current = 0;

  displays.forEach((display, index) => {
    indices.push(current);
    if (tokenEndsSentence(display) && index < displays.length - 1) {
      current += 1;
    }
  });

  return indices;
}

export function cycleTextWordMark(current: TextWordMark): TextWordMark {
  switch (current) {
    case "unmarked":
      return "acertou";
    case "acertou":
      return "errou";
    case "errou":
      return "soletrou";
    case "soletrou":
      return "unmarked";
  }
}

export function deriveSentenceStatus(marks: readonly TextWordMark[]): SentenceStatus {
  if (marks.length === 0) return "pending";

  const unmarkedCount = marks.filter((mark) => mark === "unmarked").length;
  if (unmarkedCount > 0) return "pending";

  const errorCount = marks.filter((mark) => mark === "errou" || mark === "soletrou").length;
  if (errorCount === 0) return "all_correct";
  if (errorCount <= 2) return "partial";
  return "mostly_wrong";
}

export function lastMarkedPosition(marks: readonly TextWordMark[]): number {
  let last = 0;
  for (let i = 0; i < marks.length; i += 1) {
    if (marks[i] !== "unmarked") last = i + 1;
  }
  return last;
}

export function countTextErrors(marks: readonly TextWordMark[]): number {
  return marks.filter((mark) => mark === "errou" || mark === "soletrou").length;
}

/** Marca como correta cada palavra ainda sem avaliação na frase. */
export function markUnmarkedInSentenceAsCorrect(
  marks: readonly TextWordMark[],
  sentenceIndex: readonly number[],
  targetSentence: number
): TextWordMark[] {
  return marks.map((mark, index) => {
    if (sentenceIndex[index] !== targetSentence) return mark;
    return mark === "unmarked" ? "acertou" : mark;
  });
}

export function sentenceStatusByIndex(
  marks: readonly TextWordMark[],
  sentenceIndex: readonly number[]
): SentenceStatus[] {
  const grouped = new Map<number, TextWordMark[]>();
  marks.forEach((mark, i) => {
    const sentence = sentenceIndex[i] ?? 0;
    const list = grouped.get(sentence) ?? [];
    list.push(mark);
    grouped.set(sentence, list);
  });

  const maxIndex = sentenceIndex.reduce((max, value) => Math.max(max, value), 0);
  const result: SentenceStatus[] = [];
  for (let i = 0; i <= maxIndex; i += 1) {
    result.push(deriveSentenceStatus(grouped.get(i) ?? []));
  }
  return result;
}
