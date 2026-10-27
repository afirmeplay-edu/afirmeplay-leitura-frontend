import type {
  BankQuestion,
  BankQuestionOrigin,
  BankQuestionType,
  WrittenTestDetail,
  WrittenTestQuestionRef,
} from "@/lib/api/afirme-reading/types";
import { normalizeQuestionType, questionAnswerSummary, questionStatement } from "@/lib/ica/questions";

/**
 * Composição da prova escrita do ICA (decisão do produto): 16 múltipla escolha, 3 ditado e 1 produção escrita.
 * O backend só exige 20 questões para publicar; a divisão por tipo é regra do frontend.
 */
export const SLOT_LAYOUT: Array<{ type: BankQuestionType; count: number }> = [
  { type: "multipleChoice", count: 16 },
  { type: "dictation", count: 3 },
  { type: "text_production", count: 1 },
];

export const SLOT_COUNTS = Object.fromEntries(SLOT_LAYOUT.map((group) => [group.type, group.count])) as Record<
  BankQuestionType,
  number
>;

export const TOTAL_SLOTS = SLOT_LAYOUT.reduce((sum, group) => sum + group.count, 0);

/** Primeira posição (1-based) de cada tipo na prova. */
export const SLOT_START = SLOT_LAYOUT.reduce(
  (acc, group, index) => {
    acc[group.type] = index === 0 ? 1 : acc[SLOT_LAYOUT[index - 1].type] + SLOT_LAYOUT[index - 1].count;
    return acc;
  },
  {} as Record<BankQuestionType, number>
);

/** Snapshot da questão: o rascunho renderiza sem refazer a busca. */
export interface SlotItem {
  questionId: string;
  type: BankQuestionType;
  text: string;
  subjectName: string | null;
  gradeName: string | null;
  difficulty: string | null;
  answer: string;
  origin: BankQuestionOrigin;
  value: number;
  /** Questão excluída do banco depois de entrar na prova: precisa ser trocada antes de publicar. */
  missing?: boolean;
}

export type SlotGroups = Record<BankQuestionType, (SlotItem | null)[]>;

export interface AssessmentDraft {
  version: 2;
  title: string;
  description: string;
  gradeIds: string[];
  schoolIds: string[];
  classIds: string[];
  slots: SlotGroups;
  updatedAt: string | null;
}

export function emptySlots(): SlotGroups {
  return Object.fromEntries(
    SLOT_LAYOUT.map((group) => [group.type, Array.from({ length: group.count }, () => null)])
  ) as SlotGroups;
}

export function emptyAssessmentDraft(): AssessmentDraft {
  return {
    version: 2,
    title: "",
    description: "",
    gradeIds: [],
    schoolIds: [],
    classIds: [],
    slots: emptySlots(),
    updatedAt: null,
  };
}

export function toSlotItem(question: BankQuestion): SlotItem {
  return {
    questionId: question.id,
    type: normalizeQuestionType(question.type) ?? "multipleChoice",
    text: questionStatement(question) || "(sem enunciado)",
    subjectName: question.subject?.name ?? null,
    gradeName: question.grade?.name ?? null,
    difficulty: question.difficulty || null,
    answer: questionAnswerSummary(question),
    origin: question.origin,
    value: question.value ?? 1,
  };
}

export function slotPosition(type: BankQuestionType, index: number) {
  return SLOT_START[type] + index;
}

/**
 * Distribui as questões do detalhe nas posições por tipo, na ordem da prova.
 * O que não cabe na composição (ex.: prova montada fora do construtor) volta em `overflow`.
 */
export function draftFromDetail(detail: WrittenTestDetail): { draft: AssessmentDraft; overflow: SlotItem[] } {
  const slots = emptySlots();
  const overflow: SlotItem[] = [];
  const ordered = [...(detail.questions ?? [])].sort((a, b) => a.order - b.order);

  for (const question of ordered) {
    if (question.missing) {
      const item: SlotItem = {
        questionId: question.id,
        type: "multipleChoice",
        text: "Questão excluída do banco — troque antes de publicar",
        subjectName: null,
        gradeName: null,
        difficulty: null,
        answer: "",
        origin: "afirme_ler",
        value: 0,
        missing: true,
      };
      // Sem o tipo original, ocupa a próxima posição livre que existir.
      const target = SLOT_LAYOUT.find((group) => slots[group.type].some((slot) => slot === null));
      if (target) {
        const index = slots[target.type].findIndex((slot) => slot === null);
        slots[target.type][index] = { ...item, type: target.type };
      } else {
        overflow.push(item);
      }
      continue;
    }
    const item = toSlotItem(question);
    const index = slots[item.type]?.findIndex((slot) => slot === null) ?? -1;
    if (index >= 0) slots[item.type][index] = item;
    else overflow.push(item);
  }

  return {
    draft: {
      version: 2,
      title: detail.title ?? "",
      description: detail.description ?? "",
      gradeIds: detail.gradeIds ?? [],
      schoolIds: detail.schoolIds ?? [],
      classIds: detail.classIds ?? [],
      slots,
      updatedAt: detail.updatedAt,
    },
    overflow,
  };
}

/** Lista completa e ordenada para `PUT /questions` (ordem 1..N sem buracos, como o backend exige). */
export function toQuestionRefs(draft: AssessmentDraft, extra: SlotItem[] = []): WrittenTestQuestionRef[] {
  const items = [
    ...SLOT_LAYOUT.flatMap((group) => draft.slots[group.type].filter((slot): slot is SlotItem => slot !== null)),
    ...extra,
  ];
  return items.map((item, index) => ({ id: item.questionId, order: index + 1 }));
}

export function countFilled(draft: AssessmentDraft, type: BankQuestionType) {
  return draft.slots[type].filter(Boolean).length;
}

export function countAllFilled(draft: AssessmentDraft) {
  return SLOT_LAYOUT.reduce((sum, group) => sum + countFilled(draft, group.type), 0);
}

export function selectedQuestionIds(draft: AssessmentDraft) {
  return new Set(
    SLOT_LAYOUT.flatMap((group) => draft.slots[group.type])
      .filter((slot): slot is SlotItem => slot !== null)
      .map((slot) => slot.questionId)
  );
}

export function totalScore(draft: AssessmentDraft) {
  return SLOT_LAYOUT.flatMap((group) => draft.slots[group.type]).reduce((sum, slot) => sum + (slot?.value ?? 0), 0);
}

export function hasMissingQuestions(draft: AssessmentDraft) {
  return SLOT_LAYOUT.some((group) => draft.slots[group.type].some((slot) => slot?.missing));
}

export function isDraftEmpty(draft: AssessmentDraft) {
  return (
    !draft.title.trim() &&
    !draft.description.trim() &&
    draft.gradeIds.length === 0 &&
    draft.schoolIds.length === 0 &&
    draft.classIds.length === 0 &&
    countAllFilled(draft) === 0
  );
}

/** Dados da avaliação (título, descrição e escopo), para saber se o `PUT /:id` é necessário. */
export function metaFingerprint(draft: AssessmentDraft) {
  return JSON.stringify({
    title: draft.title.trim(),
    description: draft.description.trim(),
    gradeIds: [...draft.gradeIds].sort(),
    schoolIds: [...draft.schoolIds].sort(),
    classIds: [...draft.classIds].sort(),
  });
}

/** Lista ordenada de questões, para saber se o `PUT /:id/questions` é necessário. */
export function questionsFingerprint(draft: AssessmentDraft, extra: SlotItem[] = []) {
  return JSON.stringify(toQuestionRefs(draft, extra));
}

/* Rascunho local: só para uma avaliação nova, antes do primeiro "Salvar" (depois o servidor é a fonte). */

function draftKey(cityId: string | null | undefined) {
  return `ica_written_test_draft:${cityId || "sem-municipio"}`;
}

function isSlotItem(value: unknown): value is SlotItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.questionId === "string" && typeof item.text === "string" && typeof item.type === "string";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function readAssessmentDraft(cityId: string | null | undefined): AssessmentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(cityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentDraft>;
    if (parsed?.version !== 2 || !parsed.slots) return null;
    const slots = emptySlots();
    for (const group of SLOT_LAYOUT) {
      const stored = (parsed.slots as Partial<SlotGroups>)[group.type] ?? [];
      slots[group.type] = slots[group.type].map((_, index) => {
        const item = stored[index];
        return isSlotItem(item) && item.type === group.type ? item : null;
      });
    }
    return {
      version: 2,
      title: typeof parsed.title === "string" ? parsed.title : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      gradeIds: stringArray(parsed.gradeIds),
      schoolIds: stringArray(parsed.schoolIds),
      classIds: stringArray(parsed.classIds),
      slots,
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
  // Rascunho da versão anterior (só múltipla escolha, sem API): descartado para não reaparecer.
  window.localStorage.removeItem(`ica_assessment_draft:${cityId || "sem-municipio"}`);
}
