import axios from "axios";
import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  AnswerSheetRun,
  AnswerSheetRunList,
  ApplyWrittenTestPayload,
  BankQuestionPagination,
  CreateWrittenTestPayload,
  ListWrittenTestsParams,
  UpdateWrittenTestPayload,
  WrittenTestClassesResponse,
  WrittenTestClassStudents,
  WrittenTestDetail,
  WrittenTestList,
  WrittenTestQuestionRef,
  WrittenTestSummary,
} from "@/lib/api/afirme-reading/types";

function compact<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function fallbackPagination(page: number, perPage: number, total: number): BankQuestionPagination {
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

/** GET /written-tests (paginado; `per_page` máximo 100). */
export async function listWrittenTests(
  params: ListWrittenTestsParams = {},
  config?: { signal?: AbortSignal }
): Promise<WrittenTestList> {
  const page = params.page ?? 1;
  const perPage = Math.min(params.per_page ?? 10, 100);
  const { data } = await afirmeReadingApi.get<WrittenTestList | WrittenTestSummary[]>("/written-tests", {
    ...config,
    params: compact({ ...params, page, per_page: perPage }),
  });
  if (Array.isArray(data)) return { data, pagination: fallbackPagination(page, perPage, data.length) };
  const items = Array.isArray(data?.data) ? data.data : [];
  return { data: items, pagination: data?.pagination ?? fallbackPagination(page, perPage, items.length) };
}

export async function getWrittenTest(id: string) {
  const { data } = await afirmeReadingApi.get<WrittenTestDetail>(`/written-tests/${id}`);
  return data;
}

/** Exige título e ao menos uma série, uma escola e uma turma (o backend valida o vínculo turma × escola × série). */
export async function createWrittenTest(payload: CreateWrittenTestPayload) {
  const { data } = await afirmeReadingApi.post<WrittenTestDetail>("/written-tests", payload);
  return data;
}

export async function updateWrittenTest(id: string, payload: UpdateWrittenTestPayload) {
  const { data } = await afirmeReadingApi.put<WrittenTestDetail>(`/written-tests/${id}`, payload);
  return data;
}

export async function deleteWrittenTest(id: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(`/written-tests/${id}`);
  return data;
}

/** Substitui a lista inteira (ordem 1..N sem buracos, no máximo 20). `[]` limpa. */
export async function setWrittenTestQuestions(id: string, questions: WrittenTestQuestionRef[]) {
  const { data } = await afirmeReadingApi.put<WrittenTestDetail>(`/written-tests/${id}/questions`, { questions });
  return data;
}

/** Publicar exige exatamente 20 questões; depois disso dados e questões ficam travados. */
export async function publishWrittenTest(id: string) {
  const { data } = await afirmeReadingApi.post<WrittenTestDetail>(`/written-tests/${id}/publish`);
  return data;
}

/** Upsert por turma, tudo ou nada. Turma cuja aplicação já começou não pode ser alterada. */
export async function applyWrittenTest(id: string, payload: ApplyWrittenTestPayload) {
  const { data } = await afirmeReadingApi.post<WrittenTestClassesResponse>(`/written-tests/${id}/apply`, payload);
  return data;
}

export async function listWrittenTestClasses(id: string) {
  const { data } = await afirmeReadingApi.get<WrittenTestClassesResponse>(`/written-tests/${id}/classes`);
  return data;
}

/** 400 se a avaliação ainda não foi aplicada à turma. */
export async function listWrittenTestClassStudents(id: string, classId: string) {
  const { data } = await afirmeReadingApi.get<WrittenTestClassStudents>(
    `/written-tests/${id}/classes/${classId}/students`
  );
  return data;
}

/** Só antes do início da aplicação da turma. */
export async function removeWrittenTestClass(id: string, classId: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(`/written-tests/${id}/classes/${classId}`);
  return data;
}

/** Geração assíncrona (202). Sem `classId` = todas as turmas aplicadas. 409 se já houver geração em andamento. */
export async function createAnswerSheets(id: string, classId?: string | null) {
  const { data } = await afirmeReadingApi.post<AnswerSheetRun>(
    `/written-tests/${id}/answer-sheets`,
    classId ? { classId } : {}
  );
  return data;
}

export async function listAnswerSheets(id: string) {
  const { data } = await afirmeReadingApi.get<AnswerSheetRunList>(`/written-tests/${id}/answer-sheets`);
  return Array.isArray(data?.runs) ? data.runs : [];
}

/** Erros de download chegam como Blob JSON; converte para o axios-error usual (mensagem do backend). */
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

async function downloadFile(path: string, fallbackName: string) {
  try {
    const response = await afirmeReadingApi.get<Blob>(path, { responseType: "blob" });
    saveBlob(response.data, filenameFromDisposition(response.headers?.["content-disposition"], fallbackName));
  } catch (error) {
    throw await blobErrorToJson(error);
  }
}

/** PDF da prova (o nome do arquivo vem do backend). */
export async function downloadWrittenTestPdf(id: string, fallbackName = "avaliacao-escrita.pdf") {
  await downloadFile(`/written-tests/${id}/pdf`, fallbackName);
}

/** ZIP dos cartões-resposta de uma geração concluída. */
export async function downloadAnswerSheets(id: string, runId: string, fallbackName = "cartoes-resposta.zip") {
  await downloadFile(`/written-tests/${id}/answer-sheets/${runId}/download`, fallbackName);
}
