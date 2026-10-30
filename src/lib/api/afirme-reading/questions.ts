import type { AxiosRequestConfig } from "axios";
import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  BankQuestion,
  BankQuestionList,
  BankQuestionPagination,
  CreateBankQuestionPayload,
  ListBankQuestionsParams,
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

/** Prévia. Não cria questão. Só lê `data:image/...;base64` dentro do `formattedText`. */
export async function previewQuestionImage(formattedText: string) {
  const { data } = await afirmeReadingApi.post<{ imageDescription: string }>("/questions/image-description", {
    formattedText,
  });
  return data;
}

/** Foto já gravada na questão. Descreve, grava e devolve a questão inteira. */
export async function describeQuestionImage(id: string) {
  const { data } = await afirmeReadingApi.post<BankQuestion>(`/questions/${id}/image-description`);
  return data;
}
