import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  CreateWordListPayload,
  ListWordListsParams,
  UpdateWordListPayload,
  WordList,
} from "@/lib/api/afirme-reading/types";

export async function listWordLists(params?: ListWordListsParams) {
  const { data } = await afirmeReadingApi.get<WordList[]>("/word-lists", {
    params: {
      kind: params?.kind,
      active:
        params?.active === undefined ? undefined : params.active ? "true" : "false",
    },
  });
  return data;
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
