import type { AnswerSheetRunStatus, WrittenTestClassStatus } from "@/lib/api/afirme-reading/types";

/** Mesmo padrão do backend (`DEFAULT_TIMEZONE`). */
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const BRAZIL_TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "America/Sao_Paulo", label: "Brasília (UTC−3)" },
  { value: "America/Fortaleza", label: "Fortaleza (UTC−3)" },
  { value: "America/Recife", label: "Recife (UTC−3)" },
  { value: "America/Bahia", label: "Salvador (UTC−3)" },
  { value: "America/Belem", label: "Belém (UTC−3)" },
  { value: "America/Araguaina", label: "Araguaína (UTC−3)" },
  { value: "America/Maceio", label: "Maceió (UTC−3)" },
  { value: "America/Cuiaba", label: "Cuiabá (UTC−4)" },
  { value: "America/Campo_Grande", label: "Campo Grande (UTC−4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (UTC−4)" },
  { value: "America/Boa_Vista", label: "Boa Vista (UTC−4)" },
  { value: "America/Manaus", label: "Manaus (UTC−4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC−5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC−2)" },
];

export const CLASS_STATUS_LABEL: Record<WrittenTestClassStatus, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  encerrada: "Encerrada",
};

export const CLASS_STATUS_BADGE: Record<WrittenTestClassStatus, "info" | "warning" | "success"> = {
  agendada: "info",
  em_andamento: "warning",
  encerrada: "success",
};

export const ANSWER_SHEET_STATUS_LABEL: Record<AnswerSheetRunStatus, string> = {
  pendente: "Na fila",
  processando: "Gerando",
  concluido: "Concluída",
  erro: "Erro",
};

export function isAnswerSheetRunning(status: AnswerSheetRunStatus) {
  return status === "pendente" || status === "processando";
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Datas de aplicação são locais (sem offset) no fuso da turma: formata os componentes como vieram, sem passar
 * pelo fuso do navegador.
 */
export function formatLocalDateTime(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/** Timestamps de sistema (criação/conclusão da geração) vêm em UTC sem offset. */
export function formatUtcDateTime(value: string | null | undefined) {
  if (!value) return null;
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** `datetime-local` (YYYY-MM-DDTHH:mm) → ISO local aceito pelo backend. */
export function toLocalIso(value: string) {
  return value.length === 16 ? `${value}:00` : value;
}

/** ISO local do backend → valor de `datetime-local`. */
export function toDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
  return match ? `${match[1]}T${match[2]}` : "";
}

/** Agora + `hours`, no relógio do navegador, como valor inicial do formulário. */
export function defaultStartInput(hours = 1) {
  const date = new Date(Date.now() + hours * 3600 * 1000);
  date.setMinutes(0, 0, 0);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
