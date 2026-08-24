export interface FluencyAplicarParams {
  sessionId: string;
  evaluationId?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  schoolId?: string;
  schoolName?: string;
  readingTextId?: string;
  textTitle?: string;
  wordsWordListId?: string;
  uncommonWordListId?: string;
  caderno?: string;
  view?: boolean;
  practice?: boolean;
  aba?: string;
}

export function fluencyAplicarHref(params: FluencyAplicarParams) {
  const search = new URLSearchParams();
  search.set("sessionId", params.sessionId);
  if (params.evaluationId) search.set("evaluationId", params.evaluationId);
  if (params.studentId) search.set("studentId", params.studentId);
  if (params.studentName) search.set("studentName", params.studentName);
  if (params.classId) search.set("classId", params.classId);
  if (params.className) search.set("className", params.className);
  if (params.schoolId) search.set("schoolId", params.schoolId);
  if (params.schoolName) search.set("schoolName", params.schoolName);
  if (params.readingTextId) search.set("readingTextId", params.readingTextId);
  if (params.textTitle) search.set("textTitle", params.textTitle);
  if (params.wordsWordListId) search.set("wordsWordListId", params.wordsWordListId);
  if (params.uncommonWordListId) search.set("uncommonWordListId", params.uncommonWordListId);
  if (params.caderno) search.set("caderno", params.caderno);
  if (params.view) search.set("view", "1");
  if (params.aba) search.set("aba", params.aba);

  const path = params.practice ? "/app/avaliacao-leitura-guiada" : "/app/avaliacao-fluencia/aplicar";
  return `${path}?${search.toString()}`;
}
