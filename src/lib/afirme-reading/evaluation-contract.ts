import type {
  EvaluationKind,
  ReadingEvaluation,
  WordListKind,
} from "@/lib/api/afirme-reading/types";
import { isPrivilegedStaffRole } from "@/lib/auth/jwt";
import { EDICAO_LABEL } from "@/lib/relatorios-fluencia/types";

export { isPrivilegedStaffRole };

export function isKnownWordListKind(kind: WordListKind | string | null | undefined) {
  return kind === "PALAVRAS_CONHECIDAS" || kind === "PALAVRAS";
}

export function getEvaluationKind(evaluation: ReadingEvaluation): EvaluationKind | null {
  if (evaluation.evaluationKind) return evaluation.evaluationKind;
  const type = evaluation.assessmentType;
  if (type === "entrada" || type === "formativa" || type === "saida") return type;
  return null;
}

export function getEvaluationKindLabel(evaluation: ReadingEvaluation) {
  if (evaluation.evaluationKindLabel) return evaluation.evaluationKindLabel;
  const kind = getEvaluationKind(evaluation);
  return kind ? EDICAO_LABEL[kind] : "Avaliação de Fluência";
}

export function getKnownWordListId(evaluation: ReadingEvaluation) {
  return evaluation.knownWordListId ?? evaluation.wordsWordListId ?? evaluation.knownWordList?.id ?? null;
}

export function getCreatorId(evaluation: ReadingEvaluation) {
  if (evaluation.createdBy?.id) return evaluation.createdBy.id;
  const legacy = (evaluation as ReadingEvaluation & { created_by?: { id?: string } | string }).created_by;
  if (typeof legacy === "string" && legacy) return legacy;
  if (legacy && typeof legacy === "object" && legacy.id) return legacy.id;
  return null;
}

export function canEditEvaluation(evaluation: ReadingEvaluation, userId: string | null | undefined) {
  return Boolean(userId && getCreatorId(evaluation) === userId);
}

export function canDeleteEvaluation(
  evaluation: ReadingEvaluation,
  userId: string | null | undefined,
  role: string | null | undefined
) {
  return canEditEvaluation(evaluation, userId) || isPrivilegedStaffRole(role);
}

export function canApplyEvaluation(evaluation: ReadingEvaluation, userId: string | null | undefined, role?: string | null) {
  if (isPrivilegedStaffRole(role)) return true;
  const creatorId = getCreatorId(evaluation);
  if (!creatorId) return true;
  return Boolean(userId && creatorId === userId);
}
