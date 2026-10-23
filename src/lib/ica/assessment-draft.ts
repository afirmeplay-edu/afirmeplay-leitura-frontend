import type { BankQuestion, BankQuestionOrigin } from "@/lib/api/afirme-reading/types";
import { questionCorrectLetter, questionStatement } from "@/lib/ica/questions";

/** Layout fixo da prova do ICA: 20 itens. */
export const CLOSED_SLOTS = 16;
export const OPEN_SLOTS = 3;
export const PRODUCTION_SLOTS = 1;
export const TOTAL_SLOTS = CLOSED_SLOTS + OPEN_SLOTS + PRODUCTION_SLOTS;

/** Snapshot da questão: o rascunho renderiza sem refazer a busca. */
export interface ClosedSlotItem {
  questionId: string;
  text: string;
  subjectName: string | null;
  gradeName: string | null;
  difficulty: string | null;
  correctLetter: string;
  origin: BankQuestionOrigin;
  value: number;
}

export interface AssessmentDraft {
  version: 1;
  name: string;
  gradeId: string;
  subjectId: string;
  closed: (ClosedSlotItem | null)[];
  updatedAt: string | null;
}

export function emptyAssessmentDraft(): AssessmentDraft {
  return {
    version: 1,
    name: "",
    gradeId: "",
    subjectId: "",
    closed: Array.from({ length: CLOSED_SLOTS }, () => null),
    updatedAt: null,
  };
}

export function toSlotItem(question: BankQuestion): ClosedSlotItem {
  return {
    questionId: question.id,
    text: questionStatement(question) || "(sem enunciado)",
    subjectName: question.subject?.name ?? null,
    gradeName: question.grade?.name ?? null,
    difficulty: question.difficulty || null,
    correctLetter: questionCorrectLetter(question),
    origin: question.origin,
    value: question.value ?? 1,
  };
}

function draftKey(cityId: string | null | undefined) {
  return `ica_assessment_draft:${cityId || "sem-municipio"}`;
}

function isSlotItem(value: unknown): value is ClosedSlotItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.questionId === "string" && typeof item.text === "string";
}

export function readAssessmentDraft(cityId: string | null | undefined): AssessmentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(cityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentDraft>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.closed)) return null;
    const closed = Array.from({ length: CLOSED_SLOTS }, (_, index) => {
      const item = parsed.closed?.[index];
      return isSlotItem(item) ? item : null;
    });
    return {
      version: 1,
      name: typeof parsed.name === "string" ? parsed.name : "",
      gradeId: typeof parsed.gradeId === "string" ? parsed.gradeId : "",
      subjectId: typeof parsed.subjectId === "string" ? parsed.subjectId : "",
      closed,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export function writeAssessmentDraft(cityId: string | null | undefined, draft: AssessmentDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draftKey(cityId), JSON.stringify(draft));
}

export function clearAssessmentDraft(cityId: string | null | undefined) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(cityId));
}

export function isDraftEmpty(draft: AssessmentDraft) {
  return !draft.name.trim() && !draft.gradeId && !draft.subjectId && draft.closed.every((slot) => slot === null);
}

export function countFilledClosed(draft: AssessmentDraft) {
  return draft.closed.filter(Boolean).length;
}
