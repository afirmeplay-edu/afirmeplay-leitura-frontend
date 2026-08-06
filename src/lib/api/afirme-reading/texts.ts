import { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
import type {
  CreateReadingTextPayload,
  ListReadingTextsParams,
  ReadingText,
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
  return data;
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
