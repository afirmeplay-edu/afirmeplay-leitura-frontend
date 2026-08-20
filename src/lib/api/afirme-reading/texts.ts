import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  CreateReadingQuestionPayload,
  CreateReadingTextPayload,
  ListReadingTextsParams,
  ReadingQuestion,
  ReadingText,
  UpdateReadingQuestionPayload,
  UpdateReadingTextPayload,
} from "@/lib/api/afirme-reading/types";

export async function listReadingTexts(params?: ListReadingTextsParams) {
  const { data } = await afirmeReadingApi.get<ReadingText[]>("/texts", {
    params: {
      gradeId: params?.gradeId,
      difficultyLevel: params?.difficultyLevel,
      isCalibrated:
        params?.isCalibrated === undefined
          ? undefined
          : params.isCalibrated
            ? "true"
            : "false",
      orderBy: params?.orderBy,
    },
  });
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as ReadingText[];
    }
  }
  return [];
}

export async function getReadingText(id: string) {
  const { data } = await afirmeReadingApi.get<ReadingText>(`/texts/${id}`);
  return data;
}

export async function createReadingText(payload: CreateReadingTextPayload) {
  const { data } = await afirmeReadingApi.post<ReadingText>("/texts", payload);
  return data;
}

export async function updateReadingText(id: string, payload: UpdateReadingTextPayload) {
  const { data } = await afirmeReadingApi.patch<ReadingText>(`/texts/${id}`, payload);
  return data;
}

export async function deleteReadingText(id: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(`/texts/${id}`);
  return data;
}

export async function createReadingQuestion(textId: string, payload: CreateReadingQuestionPayload) {
  const { data } = await afirmeReadingApi.post<ReadingQuestion>(
    `/texts/${textId}/questions`,
    payload
  );
  return data;
}

export async function createReadingQuestionsBulk(
  textId: string,
  payload: CreateReadingQuestionPayload[]
) {
  const { data } = await afirmeReadingApi.post<ReadingQuestion[]>(
    `/texts/${textId}/questions/bulk`,
    payload
  );
  return data;
}

export async function updateReadingQuestion(
  textId: string,
  questionId: string,
  payload: UpdateReadingQuestionPayload
) {
  const { data } = await afirmeReadingApi.patch<ReadingQuestion>(
    `/texts/${textId}/questions/${questionId}`,
    payload
  );
  return data;
}

export async function deleteReadingQuestion(textId: string, questionId: string) {
  const { data } = await afirmeReadingApi.delete<{ message: string }>(
    `/texts/${textId}/questions/${questionId}`
  );
  return data;
}
