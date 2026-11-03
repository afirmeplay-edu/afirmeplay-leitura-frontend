import type { AxiosRequestConfig } from "axios";
import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  BankQuestion,
  BankQuestionList,
  BankQuestionPagination,
  CreateBankQuestionPayload,
  ListBankQuestionsParams,
  QuestionDocxImportCommitResult,
  QuestionDocxImportPreview,
  DictationMarks,
  UpdateBankQuestionPayload,
} from "@/lib/api/afirme-reading/types";

function emptyPagination(page: number, perPage: number, total: number): BankQuestionPagination {
  const pages = perPage > 0 ? Math.ceil(total / perPage) : 0;
  return {
    page,
    per_page: perPage,
    total,
    pages,
    has_next: page < pages,
    has_prev: page > 1,
    next_num: page < pages ? page + 1 : null,
    prev_num: page > 1 ? page - 1 : null,
  };
}

function compactParams(params: ListBankQuestionsParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function listBankQuestions(
  params: ListBankQuestionsParams = {},
  config?: Pick<AxiosRequestConfig, "signal">
): Promise<BankQuestionList> {
  const page = params.page ?? 1;
  const perPage = Math.min(params.per_page ?? 10, 100);
  const { data } = await afirmeReadingApi.get<BankQuestionList | BankQuestion[]>("/questions", {
    ...config,
    params: compactParams({ ...params, page, per_page: perPage }),
  });

  if (Array.isArray(data)) {
    return { data, pagination: emptyPagination(page, perPage, data.length) };
  }
  const items = Array.isArray(data?.data) ? data.data : [];
  return {
    data: items,
    pagination: data?.pagination ?? emptyPagination(page, perPage, items.length),
  };
}

export async function getBankQuestion(id: string) {
  const { data } = await afirmeReadingApi.get<BankQuestion>(`/questions/${id}`);
  return data;
}

export async function createBankQuestion(payload: CreateBankQuestionPayload) {
  const { data } = await afirmeReadingApi.post<BankQuestion>("/questions", payload);
  return data;
}

/** PUT parcial: só os campos alterados; `options`, se enviado, substitui a lista inteira. */
export async function updateBankQuestion(id: string, payload: UpdateBankQuestionPayload) {
  const { data } = await afirmeReadingApi.put<BankQuestion>(`/questions/${id}`, payload);
  return data;
}

/** Prévia da descrição da figura (questão ainda não salva / imagem data-URL). */
export async function previewQuestionImage(formattedText: string) {
  const { data } = await afirmeReadingApi.post<{ imageDescription?: string | null }>(
    "/questions/image-description",
    { formattedText }
  );
  return data;
}

/** Gera e grava a descrição da figura de uma questão já salva. */
export async function describeQuestionImage(questionId: string) {
  const { data } = await afirmeReadingApi.post<BankQuestion>(`/questions/${questionId}/image-description`);
  return data;
}

export interface ImportDocxConfirmationQuestion {
  index: number;
  dictationMarks: DictationMarks;
}

/**
 * O mesmo multipart faz prévia (`commit=false`) e confirmação (`commit=true`).
 * `grade` e `subjectId` valem para os blocos que não trazem esses dados.
 * `confirmation` grava os megafones ajustados na prévia, pelo índice do bloco.
 */
export async function importQuestionsDocx(
  file: File,
  options: {
    commit?: boolean;
    gradeId?: string;
    subjectId?: string;
    indexes?: number[];
    questions?: ImportDocxConfirmationQuestion[];
  } = {}
) {
  const form = new FormData();
  form.append("file", file);
  form.append("commit", options.commit ? "true" : "false");
  if (options.gradeId) form.append("grade", options.gradeId);
  if (options.subjectId) form.append("subjectId", options.subjectId);
  if (options.indexes?.length) form.append("indexes", options.indexes.join(","));
  if (options.questions) form.append("confirmation", JSON.stringify({ questions: options.questions }));
  const { data } = await afirmeReadingApi.postForm<QuestionDocxImportPreview | QuestionDocxImportCommitResult>(
    "/questions/import/docx",
    form
  );
  return data;
}
