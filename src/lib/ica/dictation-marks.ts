import type { DictationMarks } from "@/lib/api/afirme-reading/types";

export const EMPTY_DICTATION_MARKS: DictationMarks = {
  title: false,
  statement: false,
  support: false,
  images: [],
  options: [],
};

function uniqueNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is number => Number.isInteger(item) && item >= 0))].sort((a, b) => a - b);
}

function uniqueLetters(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-H]$/.test(item))
    ),
  ].sort();
}

export function normalizeDictationMarks(value: Partial<DictationMarks> | null | undefined): DictationMarks {
  return {
    title: value?.title === true,
    statement: value?.statement === true,
    support: value?.support === true,
    images: uniqueNumbers(value?.images),
    options: uniqueLetters(value?.options),
  };
}

export function hasDictationMarks(value: Partial<DictationMarks> | null | undefined) {
  const marks = normalizeDictationMarks(value);
  return marks.title || marks.statement || marks.support || marks.images.length > 0 || marks.options.length > 0;
}
