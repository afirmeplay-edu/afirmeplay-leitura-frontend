import axios from "axios";
import type { ApiErrorBody } from "@/lib/api/afirme-reading/types";

/**
 * Ordem importa: `mensagem` (decorator de plano/município) é mais específica que `erro`.
 * Formatos cobertos: `{ error }` (rotas), `{ erro, mensagem }` e `{ erro, role_required }` (decorators),
 * `{ msg }` (Flask-JWT-Extended), além de `message`/`detail`/`title`.
 */
const MESSAGE_KEYS = ["error", "mensagem", "erro", "message", "msg", "detail", "title"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorData(error: unknown): unknown {
  if (axios.isAxiosError(error)) return error.response?.data;
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { data?: unknown } }).response?.data;
  }
  return null;
}

function parsePayload(data: unknown): unknown {
  if (typeof data !== "string") return data;
  const trimmed = data.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function messageFromUnknown(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("<")) return null;
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return messageFromUnknown(JSON.parse(trimmed), depth + 1);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = messageFromUnknown(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;
  for (const key of MESSAGE_KEYS) {
    const found = messageFromUnknown(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function getApiErrorBody(error: unknown): ApiErrorBody | null {
  const payload = parsePayload(getErrorData(error));
  return asRecord(payload) as ApiErrorBody | null;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  return messageFromUnknown(parsePayload(getErrorData(error))) || fallback;
}

export function getApiErrorStatus(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.status ?? null;
  if (error && typeof error === "object" && "response" in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    return typeof status === "number" ? status : null;
  }
  return null;
}

export interface NormalizedApiError {
  status: number | null;
  message: string;
  /** Presente no 403 do `role_required`. */
  rolesRequired: string[] | null;
  isNetworkError: boolean;
}

const STATUS_FALLBACK: Record<number, string> = {
  400: "Dados inválidos. Revise o formulário.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Registro não encontrado.",
  422: "Sua sessão expirou. Entre novamente.",
  500: "Erro interno ao processar a solicitação.",
};

/** Normalizador único para toasts: mensagem do backend → fallback por status → fallback da tela. */
export function normalizeApiError(error: unknown, fallback: string): NormalizedApiError {
  const status = getApiErrorStatus(error);
  const body = asRecord(parsePayload(getErrorData(error)));
  const roles = body?.role_required;
  const isNetworkError = axios.isAxiosError(error) && !error.response;
  const message =
    messageFromUnknown(body) ||
    (isNetworkError ? "Não foi possível conectar ao servidor." : null) ||
    (status != null ? STATUS_FALLBACK[status] : null) ||
    fallback;

  return {
    status,
    message,
    rolesRequired: Array.isArray(roles) ? roles.filter((role): role is string => typeof role === "string") : null,
    isNetworkError,
  };
}
