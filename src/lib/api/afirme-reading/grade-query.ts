/** Serializa filtro de série para query string: um UUID vira gradeId; vários viram gradeIds=uuid1,uuid2. */
export function gradeListQuery(params?: { gradeId?: string; gradeIds?: string[] }) {
  const unique = [...new Set((params?.gradeIds ?? []).filter(Boolean))];
  if (unique.length > 1) {
    return { gradeIds: unique.join(",") };
  }
  const single = unique[0] ?? params?.gradeId;
  if (single) return { gradeId: single };
  return {};
}
