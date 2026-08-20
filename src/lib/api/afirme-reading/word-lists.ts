import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  CreateWordListPayload,
  ListWordListsParams,
  UpdateWordListPayload,
  WordList,
} from "@/lib/api/afirme-reading/types";

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export async function listWordLists(params?: ListWordListsParams) {
  const { data } = await afirmeReadingApi.get<WordList[]>("/word-lists", {
    params: {
      kind: params?.kind,
      active:
        params?.active === undefined ? undefined : params.active ? "true" : "false",
    },
  });
  return unwrapList<WordList>(data);
}

export async function getWordList(id: string) {
  const { data } = await afirmeReadingApi.get<WordList>(`/word-lists/${id}`);
  return data;
}

export async function createWordList(payload: CreateWordListPayload) {
  const { data } = await afirmeReadingApi.post<WordList>("/word-lists", payload);
  return data;
}

export async function updateWordList(id: string, payload: UpdateWordListPayload) {
  const { data } = await afirmeReadingApi.patch<WordList>(`/word-lists/${id}`, payload);
  return data;
}

export async function deleteWordList(id: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(`/word-lists/${id}`);
  return data;
}
