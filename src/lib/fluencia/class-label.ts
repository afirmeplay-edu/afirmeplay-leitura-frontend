/** Série/turma só é exibida quando o rótulo traz o ano (ex.: "3º Ano A"). */
export function isSerieTurmaCompleta(label?: string | null): boolean {
  const value = (label ?? "").trim();
  if (!value) return false;
  return /\d+\s*º\s*Ano/i.test(value);
}

export function yearFromGradeName(name?: string | null) {
  const match = (name ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function classMatchesGrade(
  item: { gradeId?: string | null; year?: number | null; name: string },
  grade: { id: string; name: string } | null
) {
  if (!grade) return false;
  if (item.gradeId) return item.gradeId === grade.id;
  const year = yearFromGradeName(grade.name);
  if (year == null) return !item.gradeId && item.year == null;
  if (item.year != null) return item.year === year;
  if (new RegExp(`${year}\\s*º`).test(item.name)) return true;
  return !item.gradeId && item.year == null;
}

export function classMatchesAnyGrade(
  item: { gradeId?: string | null; year?: number | null; name: string },
  grades: Array<{ id: string; name: string }>
) {
  if (!grades.length) return false;
  return grades.some((grade) => classMatchesGrade(item, grade));
}
