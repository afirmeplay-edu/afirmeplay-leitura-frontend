import axios, { type AxiosRequestConfig } from "axios";
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

async function blobErrorToJson(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await error.response.data.text());
    } catch {
      /* mantém o corpo original */
    }
  }
  return error;
}

function filenameFromDisposition(header: unknown, fallback: string) {
  if (typeof header !== "string") return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* usa o nome simples */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? fallback;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

/** Baixa o modelo DOCX com série, disciplina e blocos vazios. */
export async function downloadQuestionsImportTemplate(options: {
  gradeId: string;
  subjectId: string;
  count: number;
}) {
  try {
    const response = await afirmeReadingApi.get<Blob>("/questions/import/template", {
      responseType: "blob",
      params: {
        grade: options.gradeId,
        subjectId: options.subjectId,
        count: options.count,
      },
    });
    saveBlob(
      response.data,
      filenameFromDisposition(response.headers?.["content-disposition"], "modelo_importacao_questoes.docx")
    );
  } catch (error) {
    throw await blobErrorToJson(error);
  }
}

/**
 * O mesmo multipart faz prévia (`commit=false`) e confirmação (`commit=true`).
 * `grade` e `subjectId` valem para os blocos que não trazem esses dados.
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
