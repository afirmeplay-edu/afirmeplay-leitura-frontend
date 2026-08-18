/** Série/turma só é exibida quando o rótulo traz o ano (ex.: "3º Ano A"). */
export function isSerieTurmaCompleta(label?: string | null): boolean {
  const value = (label ?? "").trim();
  if (!value) return false;
  return /\d+\s*º\s*Ano/i.test(value);
}
