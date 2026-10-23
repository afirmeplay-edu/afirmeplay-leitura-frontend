export const QUESTION_IMAGE_MAX_BYTES = 1024 * 1024;
export const QUESTION_IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

const ACCEPTED_TYPES = new Set(QUESTION_IMAGE_ACCEPT.split(","));

export class QuestionImageError extends Error {}

/** Lê a imagem como data-URL (o backend envia ao MinIO). Valida tipo e tamanho antes. */
export function readQuestionImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return Promise.reject(new QuestionImageError("Use uma imagem PNG, JPG, GIF ou WEBP."));
  }
  if (file.size > QUESTION_IMAGE_MAX_BYTES) {
    return Promise.reject(new QuestionImageError("A imagem deve ter no máximo 1 MB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new QuestionImageError("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}
