export type WordListKind = "PALAVRAS_CONHECIDAS" | "PALAVRAS" | "POUCO_COMUNS";

export type ScopeType = "GLOBAL" | "CITY" | "PRIVATE";

export type DifficultyLevel = "VERY_EASY" | "EASY" | "MEDIUM" | "HARD" | "VERY_HARD";

export interface WordList {
  id: string;
  name: string;
  kind: WordListKind;
  items: string[];
  description: string | null;
  isDefault: boolean;
  active: boolean;
  scopeType: ScopeType;
  gradeId?: string | null;
  grade?: GradeRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWordListPayload {
  name: string;
  gradeId: string;
  kind?: WordListKind;
  items?: string[] | string;
  description?: string | null;
  isDefault?: boolean;
  active?: boolean;
}

export type UpdateWordListPayload = Partial<CreateWordListPayload>;

export interface ListWordListsParams {
  kind?: WordListKind;
  active?: boolean;
  gradeId?: string;
  gradeIds?: string[];
}

export interface GradeRef {
  id: string;
  name: string;
}

export interface ReadingQuestion {
  id: string;
  readingTextId: string;
  statement: string;
  options: string[];
  correctOption: number | null;
  descriptor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingText {
  id: string;
  title: string;
  content: string;
  gradeId: string;
  grade?: GradeRef | null;
  difficultyLevel: DifficultyLevel;
  targetSkills: string[];
  source: string | null;
  isCalibrated: boolean;
  scopeType: ScopeType;
  questions?: ReadingQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReadingTextQuestionOptionPayload {
  text: string;
  isCorrect: boolean;
}

export interface CreateReadingTextQuestionPayload {
  statement: string;
  options: CreateReadingTextQuestionOptionPayload[];
  descriptor: string;
}

export interface CreateReadingQuestionPayload {
  statement: string;
  options: string[];
  correctOption: number;
  descriptor: string;
}

export interface UpdateReadingQuestionPayload {
  statement?: string;
  descriptor?: string;
  options?: string[] | CreateReadingTextQuestionOptionPayload[];
  correctOption?: number;
}

export interface CreateReadingTextPayload {
  title: string;
  content: string;
  gradeId: string;
  difficultyLevel: DifficultyLevel;
  targetSkills?: string[];
  source?: string | null;
  isCalibrated?: boolean;
  questions?: CreateReadingTextQuestionPayload[];
}

export type UpdateReadingTextPayload = Partial<Omit<CreateReadingTextPayload, "questions">>;

export interface ListReadingTextsParams {
  gradeId?: string;
  gradeIds?: string[];
  difficultyLevel?: DifficultyLevel;
  isCalibrated?: boolean;
  orderBy?: "title" | "difficulty" | "grade";
}

export interface EducationStage {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  name: string;
  education_stage_id: string;
  education_stage?: EducationStage | Record<string, unknown> | null;
}

export interface GuidedSessionAnswer {
  id?: string;
  sessionId?: string;
  readingTextQuestionId: string;
  selectedOption: number;
  isCorrect?: boolean;
  createdAt?: string;
}

export interface CreateGuidedSessionPayload {
  studentId: string;
  readingTextId: string;
  wordsRead: number;
  readingTimeSeconds: number;
  errorsCount?: number;
  prosodyLevel: number;
  answers?: Array<{
    readingTextQuestionId: string;
    selectedOption: number;
  }>;
}

export interface GuidedSession {
  id: string;
  studentId: string;
  studentName: string | null;
  classId: string | null;
  readingTextId: string;
  wordsRead: number;
  readingTimeSeconds: number;
  errorsCount: number;
  prosodyLevel: number;
  status: "em_andamento" | "finalizada";
  calculatedPlcm: number | null;
  calculatedAccuracy: number | null;
  comprehensionCorrectCount: number | null;
  comprehensionTotal: number | null;
  comprehensionScore: number | null;
  audioUrl: string | null;
  audioMimeType: string | null;
  audioSizeBytes: number | null;
  hasAudio: boolean;
  appliedBy: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  answers?: GuidedSessionAnswer[];
}

export interface ListGuidedSessionsParams {
  studentId?: string;
  readingTextId?: string;
  status?: "em_andamento" | "finalizada";
  limit?: number;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  sessionId?: string;
  status?: string;
}

export type ReadingSessionStatus =
  | "pendente"
  | "em_andamento"
  | "finalizada"
  | "ausente";

export type FluencyWordStatus =
  | "nao_leu"
  | "acertou"
  | "inventou"
  | "silabou"
  | "soletrou"
  | "errou";

export type FluencyNotReadReason =
  | "nao_se_aplica"
  | "recusou"
  | "nao_consegue"
  | "nao_sabe";

export type FluencyAudioPart = "q1" | "q2" | "q3" | "mic_test";

export type FluencyMarkingSource = "ia" | "manual" | "timeout";

export interface FluencyWordMarking {
  index: number;
  word: string;
  status: FluencyWordStatus | null;
  source?: FluencyMarkingSource;
}

export interface FluencyListPartPayload {
  wordsRead: number;
  lastWordPosition: number;
  errorsCount: number;
  readingTimeSeconds: number;
  skipped: boolean;
  notReadReason: FluencyNotReadReason | null;
  transcript: string | null;
  markings: FluencyWordMarking[];
  sttProvider?: "web_speech_api";
}

export interface FluencyTextLinePayload {
  lineIndex: number;
  text: string;
  wrongWordsCount: number;
}

export interface FluencyTextPartPayload {
  wordsRead: number;
  totalWords: number;
  errorsCount: number;
  unreadAfterEnd: number;
  readingTimeSeconds: number;
  skipped: boolean;
  notReadReason: FluencyNotReadReason | null;
  obeyedSensePauses: boolean | null;
  transcript: string | null;
  lines: FluencyTextLinePayload[];
  lastWordPosition?: number;
  markings?: FluencyWordMarking[];
  sttProvider?: "web_speech_api";
}

/** PATCH incremental: envie só a parte que acabou de concluir. */
export interface SaveFluencyPayload {
  kind?: "FLUENCY";
  caderno?: string;
  prosodyLevel?: number | null;
  q1?: FluencyListPartPayload;
  q2?: FluencyListPartPayload;
  q3?: FluencyTextPartPayload;
  extras?: {
    sttProvider?: "web_speech_api";
    browser?: string;
    notes?: string;
  };
}

export interface CreateFluencySessionPayload {
  evaluationId?: string;
  studentId: string;
  /** Campos legados — a prática ainda pode enviá-los; o fluxo oficial usa só evaluationId + studentId. */
  classId?: string;
  schoolId?: string;
  readingTextId?: string;
  wordsWordListId?: string | null;
  knownWordListId?: string | null;
  uncommonWordListId?: string | null;
  caderno?: string;
}

export interface FluencySession {
  id: string;
  studentId: string;
  studentName: string | null;
  classId: string | null;
  schoolId: string | null;
  readingTextId: string;
  evaluationId?: string | null;
  wordsWordListId: string | null;
  knownWordListId?: string | null;
  uncommonWordListId: string | null;
  caderno: string;
  status: ReadingSessionStatus;
  fluencyData: Record<string, unknown> | null;
  partAudios: Record<string, unknown>;
  hasAudio: boolean;
  audioUrls: Record<string, string>;
  icaScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  appliedBy: string | null;
  answers: ReadingComprehensionAnswer[];
}

export type ReadingEvaluationStatus =
  | "rascunho"
  | "agendada"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export type EvaluationKind = "entrada" | "formativa" | "saida";

/** Campo legado; o contrato atual usa evaluationKind. */
export type ReadingAssessmentType =
  | "fluencia"
  | "compreensao"
  | "completa"
  | EvaluationKind;

export interface EvaluationCreator {
  id: string;
  name: string;
}

export interface EvaluationScopeSchool {
  id: string;
  name: string;
}

export interface EvaluationScopeClass {
  id: string;
  name: string;
  schoolId?: string | null;
  gradeId?: string | null;
}

export interface EvaluationScopeStudent {
  id: string;
  name: string;
  classId?: string | null;
  schoolId?: string | null;
}

export interface EvaluationScope {
  grade?: GradeRef | null;
  schools: EvaluationScopeSchool[];
  classes: EvaluationScopeClass[];
  students: EvaluationScopeStudent[];
}

export interface ReadingEvaluation {
  id: string;
  title: string;
  description: string | null;
  readingTextId: string;
  knownWordListId?: string | null;
  wordsWordListId?: string | null;
  uncommonWordListId: string | null;
  gradeId: string | null;
  grade?: GradeRef | null;
  gradeIds?: string[];
  grades?: GradeRef[] | null;
  classIds: string[];
  schoolIds: string[];
  studentIds?: string[];
  evaluationKind?: EvaluationKind;
  evaluationKindLabel?: string;
  assessmentType?: ReadingAssessmentType;
  status: ReadingEvaluationStatus;
  applicationStart: string | null;
  applicationEnd: string | null;
  timezone: string | null;
  createdBy?: EvaluationCreator | null;
  createdAt: string | null;
  updatedAt: string | null;
  readingText?: ReadingText | null;
  knownWordList?: WordList | null;
  uncommonWordList?: WordList | null;
  scope?: EvaluationScope | null;
  sessions?: ReadingEvaluationSession[];
}

export interface CreateReadingEvaluationPayload {
  title: string;
  evaluationKind: EvaluationKind;
  readingTextId: string;
  knownWordListId: string;
  wordsWordListId?: string | null;
  uncommonWordListId: string;
  description?: string | null;
  gradeIds: string[];
  gradeId?: string;
  classIds: string[];
  schoolIds: string[];
  studentIds?: string[];
  timezone?: string;
}

export type UpdateReadingEvaluationPayload = Partial<CreateReadingEvaluationPayload>;

export interface EvaluationApplicantApplication {
  sessionId: string;
  status: ReadingSessionStatus;
  startedAt: string | null;
  submittedAt: string | null;
}

export interface EvaluationApplicantStudent {
  id: string;
  name: string;
  classId: string;
  schoolId?: string | null;
  application: EvaluationApplicantApplication | null;
  canStart: boolean;
  canContinue: boolean;
  canView: boolean;
}

export interface EvaluationApplicantClass {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  gradeId?: string | null;
  students: EvaluationApplicantStudent[];
}

export interface EvaluationApplicants {
  evaluationId: string;
  evaluationTitle: string;
  evaluationKind?: EvaluationKind;
  grade?: GradeRef | null;
  classes: EvaluationApplicantClass[];
}

export interface ListReadingEvaluationsParams {
  status?: ReadingEvaluationStatus;
  evaluationKind?: EvaluationKind;
}

export interface SaveComprehensionAnswerItem {
  readingTextQuestionId: string;
  selectedOption: number;
}

export interface SaveComprehensionAnswersPayload {
  answers: SaveComprehensionAnswerItem[];
}

export interface ReadingComprehensionAnswer {
  id: string;
  sessionId: string;
  readingTextQuestionId: string;
  selectedOption: number;
  isCorrect: boolean | null;
  createdAt: string | null;
}

export interface ReadingEvaluationSession {
  id: string;
  readingEvaluationId: string;
  studentId: string;
  studentName?: string | null;
  classId: string | null;
  status: ReadingSessionStatus;
  fluencyData: Record<string, unknown> | null;
  calculatedPlcm: number | null;
  calculatedAccuracy: number | null;
  precisionLevel: string | null;
  fluencyLevel: string | null;
  icaScore: number | null;
  icaBreakdown: Record<string, unknown> | null;
  prosodyLevel: number | null;
  comprehensionCorrectCount: number | null;
  comprehensionTotal: number | null;
  comprehensionScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  appliedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  answers?: ReadingComprehensionAnswer[];
}

export interface FluencyPartReport {
  wordsRead?: number;
  lastWordPosition?: number;
  totalWords?: number;
  errorsCount?: number;
  unreadAfterEnd?: number;
  readingTimeSeconds?: number;
  skipped?: boolean;
  notReadReason?: FluencyNotReadReason | null;
  obeyedSensePauses?: boolean | null;
  markings?: FluencyWordMarking[];
  lines?: FluencyTextLinePayload[];
  transcript?: string | null;
  accuracy?: number | null;
  plcm?: number | null;
  precisionLevel?: string | null;
  fluencyLevel?: string | null;
  hasAudio?: boolean;
  audioUrl?: string | null;
  [key: string]: unknown;
}

export interface FluencySessionReport {
  sessionId: string;
  studentId?: string;
  studentName: string | null;
  classId?: string | null;
  schoolId?: string | null;
  status: ReadingSessionStatus;
  readingTextId?: string | null;
  wordsWordListId?: string | null;
  uncommonWordListId?: string | null;
  caderno: string | null;
  q1: FluencyPartReport | null;
  q2: FluencyPartReport | null;
  q3: FluencyPartReport | null;
  micTest?: { hasAudio?: boolean; audioUrl?: string | null };
  prosodyLevel?: number | null;
  extras?: Record<string, unknown>;
  comprehension: {
    correctCount: number | null;
    total: number | null;
    score: number | null;
    answers?: ReadingComprehensionAnswer[];
  };
  calculatedPlcm?: number | null;
  calculatedAccuracy?: number | null;
  precisionLevel?: string | null;
  fluencyLevel?: string | null;
  icaScore: number | null;
  leiturimetroLevel?: number | null;
  icaBreakdown: Record<string, unknown> | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  /** Campos legados (sessões por avaliação). */
  evaluationId?: string;
  evaluationTitle?: string;
  assessmentType?: string;
}

/** GET /resultados/estudantes/:studentId/aplicacao */
export interface StudentApplicationWord {
  index: number;
  word: string;
  status: FluencyWordStatus | null;
  source?: FluencyMarkingSource;
}

export interface StudentApplicationListPart {
  wordListId?: string | null;
  lastWordPosition?: number | null;
  words?: StudentApplicationWord[] | null;
}

export interface StudentApplicationTextPart {
  readingTextId?: string | null;
  title?: string | null;
  content: string;
  lines?: FluencyTextLinePayload[] | null;
  hasWordMarkings?: boolean;
  markings?: StudentApplicationWord[] | null;
  words?: StudentApplicationWord[] | null;
  lastWordPosition?: number | null;
  lastLineIndex?: number | null;
  wordsRead?: number | null;
  totalWords?: number | null;
}

export interface StudentApplicationComprehensionAnswer {
  readingTextQuestionId?: string;
  questionId?: string;
  statement?: string;
  question?: string;
  selectedOption?: number;
  selectedOptionText?: string;
  isCorrect?: boolean | null;
  correctOption?: number;
  options?: string[];
}

export interface StudentApplicationComprehension {
  correctCount: number | null;
  total: number | null;
  score: number | null;
  answers?: StudentApplicationComprehensionAnswer[] | null;
}

export interface StudentApplicationAudioUrls {
  q1?: string | null;
  q2?: string | null;
  q3?: string | null;
}

export interface StudentApplicationResult {
  studentId: string;
  studentName: string;
  sessionId: string;
  evaluationId: string;
  evaluationKind?: EvaluationKind | null;
  status: ReadingSessionStatus;
  lista1?: StudentApplicationListPart | null;
  lista2?: StudentApplicationListPart | null;
  texto?: StudentApplicationTextPart | null;
  compreensao?: StudentApplicationComprehension | null;
  audioUrls?: StudentApplicationAudioUrls | null;
}

/** Banco de questões do ICA — `/afirme-reading/questions` (CONTRATO_QUESTOES.md). */
export type BankQuestionOrigin = "afirme_ler" | "afirme_play";

/** Tipos aceitos pelo Afirme Ler: múltipla escolha, ditado e produção escrita (sem gabarito). */
export type BankQuestionType = "multipleChoice" | "dictation" | "text_production";

/** Ditado por palavra falada (`word`, padrão) ou por figura (`image`). */
export type DictationStimulus = "word" | "image";

/** Valores usados no Play; o formatter devolve "Médio" quando vazio, então a resposta é `string`. */
export type BankQuestionDifficulty = "Abaixo do Básico" | "Básico" | "Adequado" | "Avançado";

export interface BankQuestionRef {
  id: string;
  name: string;
}

export interface BankQuestionImage {
  id: string;
  type?: string | null;
  width?: number | null;
  height?: number | null;
  minio_bucket?: string | null;
  minio_object_name?: string | null;
  /** `/questions/<questionId>/images/<imageId>` — rota do Play, fora de `/afirme-reading`. */
  imageUrl?: string | null;
}

export interface BankQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  image?: BankQuestionImage | null;
}

export interface BankQuestion {
  id: string;
  number: number;
  title: string;
  description: string;
  text: string;
  formattedText: string;
  secondStatement: string;
  type: string;
  alternatives: BankQuestionOption[];
  options: BankQuestionOption[];
  solution: string;
  correct_answer: string;
  formattedSolution: string;
  skills: string[];
  difficulty: string;
  value: number;
  topics: unknown[];
  version: number;
  subject: BankQuestionRef | null;
  grade: BankQuestionRef | null;
  educationStage: BankQuestionRef | null;
  createdAt: string | null;
  createdBy: BankQuestionRef | null;
  updatedAt: string | null;
  lastModifiedBy: BankQuestionRef | null;
  origin: BankQuestionOrigin;
  scopeType: ScopeType;
  /** `word` quando omitido. `image` quando o aluno nomeia a figura do enunciado. */
  stimulus?: DictationStimulus | string | null;
  /** Descrição da figura, gerada depois que a imagem já está salva. Não entra no PDF. */
  imageDescription?: string | null;
  /** Palavra ditada quando `stimulus` é `word`; `null` na figura e nos outros tipos. */
  dictatedWord?: string | null;
}

export interface BankQuestionPagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_num: number | null;
  prev_num: number | null;
}

export interface BankQuestionList {
  data: BankQuestion[];
  pagination: BankQuestionPagination;
}

export interface ListBankQuestionsParams {
  page?: number;
  /** Máximo 100 (acima disso o backend usa 100). */
  per_page?: number;
  type?: BankQuestionType;
  subject_id?: string;
  grade_id?: string;
  difficulty?: string;
  origin?: BankQuestionOrigin;
  q?: string;
}

export interface BankQuestionOptionPayload {
  /** Letra (A–H). */
  id?: string;
  text: string;
  /** data-URL (nova imagem) ou o objeto devolvido pela API (imagem já salva). */
  image?: string | BankQuestionImage | null;
  /** Booleano real: o backend recusa `"true"`. */
  isCorrect: boolean;
}

/**
 * `solution`/`correct_answer` não são enviados: o backend calcula a letra (múltipla escolha) ou usa
 * `dictatedWord` (ditado falado). Ditado por figura omite `dictatedWord`. Ditado e produção escrita
 * não levam `options`.
 */
export interface CreateBankQuestionPayload {
  text: string;
  formattedText?: string;
  secondStatement?: string;
  type: BankQuestionType;
  stimulus?: DictationStimulus;
  dictatedWord?: string;
  /** Só no ditado por figura. A prévia devolve o texto; o salvamento é que grava. */
  imageDescription?: string;
  subjectId: string;
  grade: string;
  educationStageId?: string | null;
  difficulty?: BankQuestionDifficulty;
  skills?: string;
  value?: number;
  topics?: string[];
  options?: BankQuestionOptionPayload[];
  formattedSolution?: string;
}

/** PUT parcial; `null` limpa campos opcionais (o contrato converte `educationStageId: ""` em `null`). */
export type UpdateBankQuestionPayload = {
  [K in keyof CreateBankQuestionPayload]?: CreateBankQuestionPayload[K] | null;
};

/* ---------------------------------------------------------------------------------------------------------
 * Avaliação escrita do ICA — `/afirme-reading/written-tests` (written_test_service.py).
 * ------------------------------------------------------------------------------------------------------- */

export type WrittenTestStatus = "rascunho" | "publicada";

export interface WrittenTestNamedRef {
  id: string;
  name: string | null;
}

export interface WrittenTestClassRef extends WrittenTestNamedRef {
  schoolId: string | null;
  gradeId: string | null;
}

export interface WrittenTestSummary {
  id: string;
  title: string;
  description: string | null;
  status: WrittenTestStatus;
  gradeIds: string[];
  schoolIds: string[];
  classIds: string[];
  createdBy: { id: string | null; name: string | null } | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  totalQuestions: number;
  totalScore: number;
  questionsByType: Record<BankQuestionType, number>;
  appliedClassesCount: number;
  /** Data/hora local (sem fuso) do próximo início agendado. */
  nextApplicationStart: string | null;
}

/** Questão excluída do banco depois de entrar na prova (o backend devolve só id/order). */
export interface WrittenTestMissingQuestion {
  id: string;
  order: number;
  missing: true;
}

export type WrittenTestQuestion = (BankQuestion & { order: number; missing?: false }) | WrittenTestMissingQuestion;

export interface WrittenTestDetail extends WrittenTestSummary {
  grades: WrittenTestNamedRef[];
  schools: WrittenTestNamedRef[];
  classes: WrittenTestClassRef[];
  questions: WrittenTestQuestion[];
}

export interface WrittenTestList {
  data: WrittenTestSummary[];
  pagination: BankQuestionPagination;
}

export interface ListWrittenTestsParams {
  page?: number;
  per_page?: number;
  status?: WrittenTestStatus;
  grade_id?: string;
  school_id?: string;
  q?: string;
}

export interface WrittenTestQuestionRef {
  id: string;
  order: number;
}

export interface CreateWrittenTestPayload {
  title: string;
  description?: string | null;
  gradeIds: string[];
  schoolIds: string[];
  classIds: string[];
  questions?: WrittenTestQuestionRef[];
}

/** Só em rascunho. Enviar qualquer campo de escopo revalida o escopo inteiro. */
export type UpdateWrittenTestPayload = Partial<Omit<CreateWrittenTestPayload, "questions">>;

export type WrittenTestClassStatus = "agendada" | "em_andamento" | "encerrada";

export interface WrittenTestClassApplication {
  classId: string;
  className: string | null;
  school: { id: string; name: string } | null;
  grade: { id: string; name: string } | null;
  applied: boolean;
  /** Data/hora local no fuso `timezone`, sem offset (ex.: `2026-11-03T08:00:00`). */
  applicationStart: string | null;
  applicationEnd: string | null;
  timezone: string | null;
  status: WrittenTestClassStatus | null;
  studentCount: number;
}

export interface WrittenTestClassesResponse {
  writtenTestId: string;
  classes: WrittenTestClassApplication[];
}

export interface WrittenTestStudent {
  id: string;
  name: string;
  registration: string | null;
  subturma: { id: string; name: string } | null;
}

export interface WrittenTestClassStudents extends WrittenTestClassApplication {
  writtenTestId: string;
  students: WrittenTestStudent[];
}

export interface ApplyWrittenTestPayload {
  classIds: string[];
  /** ISO 8601 local (sem offset) no fuso `timezone`. */
  applicationStart: string;
  applicationEnd?: string | null;
  timezone?: string;
}

export type AnswerSheetRunStatus = "pendente" | "processando" | "concluido" | "erro";

export interface AnswerSheetRun {
  id: string;
  writtenTestId: string;
  classId: string | null;
  className: string | null;
  allClasses: boolean;
  status: AnswerSheetRunStatus;
  taskId: string | null;
  totalStudents: number;
  generatedCount: number;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  hasAnswerSheetMap: boolean;
  zipAvailable: boolean;
  downloadUrl: string | null;
}

export interface AnswerSheetRunList {
  writtenTestId: string;
  runs: AnswerSheetRun[];
}

/** POST /written-tests/{id}/answer-sheet-corrections. O lote é síncrono; `qr` vem em snake_case. */
export interface AnswerSheetMarkedAnswer {
  number: number;
  questionId: string;
  letter: string;
}

export interface AnswerSheetOpenAnswer {
  number: number;
  questionId: string;
}

export interface AnswerSheetCrop {
  number: number;
  questionId: string;
  saved: boolean;
  /** PNG autenticado. `null` quando `saved` é false. Já inclui `/afirme-reading`. */
  imageUrl?: string | null;
}

export interface AnswerSheetCorrectionStudent {
  studentPrefix: string | null;
  studentId: string | null;
  studentName: string | null;
  saved: boolean;
  reason: string | null;
  correctionId?: string | null;
  answers: AnswerSheetMarkedAnswer[];
  blank: AnswerSheetOpenAnswer[];
  invalid: AnswerSheetOpenAnswer[];
  crops: AnswerSheetCrop[];
  pages: number[];
  missingPages: number[];
}

export interface AnswerSheetCorrectionQr {
  student_id?: string | null;
  written_test_id?: string | null;
  page?: number | null;
  page_count?: number | null;
}

export interface AnswerSheetCorrectionIssue {
  fileIndex: number;
  pageIndex: number;
  filename: string;
  reason: string;
  qr?: AnswerSheetCorrectionQr | null;
}

export interface AnswerSheetCorrectionResult {
  writtenTestId: string;
  pageCount: number;
  fileCount: number;
  students: AnswerSheetCorrectionStudent[];
  skipped: AnswerSheetCorrectionIssue[];
  errors: AnswerSheetCorrectionIssue[];
}

export type AnswerSheetObjectiveStatus = "CORRETA" | "INCORRETA" | "EM_BRANCO" | "INVALIDA" | "PENDENTE";

export interface AnswerSheetObjectiveItem {
  number: number;
  questionId: string;
  letter: string | null;
  answerKey: string | null;
  points: number;
  status: AnswerSheetObjectiveStatus | string;
}

/** `points` fica `null` enquanto alguma objetiva ainda está `PENDENTE`. */
export interface AnswerSheetObjectiveScore {
  points: number | null;
  maxPoints: number;
  items: AnswerSheetObjectiveItem[];
}

export type AnswerSheetWritingSource = "ia" | "manual";
export type AnswerSheetWritingStatus = "CONCLUIDA" | "PENDENTE_REVISAO" | "ERRO";

/** Uma das duas leituras da letra. No lançamento manual a lista vem vazia. */
export interface AnswerSheetWritingReading {
  model: string;
  transcription: string;
  situation: string;
  uncertain: string[];
}

export interface AnswerSheetWritingWord {
  number: number;
  questionId: string;
  stimulus: string;
  expected: string;
  /** Texto usado na nota: primeira leitura, se as duas coincidiram, ou o texto conferido. */
  transcription: string;
  secondTranscription: string;
  readings: AnswerSheetWritingReading[];
  points: number | null;
  classification: string;
  justification: string;
  confidence: string;
  needsReview: boolean;
  status: string;
}

export interface AnswerSheetWritingProduction {
  number: number;
  questionId: string;
  genre: string;
  transcription: string;
  secondTranscription: string;
  readings: AnswerSheetWritingReading[];
  criteria: Record<string, number | null>;
  justifications: Record<string, string>;
  points: number | null;
  confidence: string;
  needsReview: boolean;
  status: string;
}

export interface AnswerSheetWritingReview {
  reviewerId: string | null;
  reviewedAt: string | null;
  decision: string | null;
}

export interface AnswerSheetWritingAuditItem {
  number: number;
  transcription: string;
  points: number | null;
  status: string;
  evidence: string;
}

export interface AnswerSheetWritingPromptVersions {
  leitura: string;
  avaliacao: string;
}

/** Uma transcrição por evento. Não substitui `readings`. */
export interface AnswerSheetWritingAuditEntry {
  at: string;
  action: string;
  actorId: string | null;
  decision: string | null;
  promptVersions: AnswerSheetWritingPromptVersions | null;
  items: AnswerSheetWritingAuditItem[];
}

export interface AnswerSheetWritingFeedback {
  demonstrated: string[];
  difficulties: string[];
  interventions: string[];
  notes: string;
}

/** `null` quando o ditado e o bilhete ainda não foram corrigidos. Em `ERRO`, a nota da escrita não fecha. */
export interface AnswerSheetWritingScore {
  source: AnswerSheetWritingSource | string;
  status: AnswerSheetWritingStatus | string;
  published: boolean;
  model: string | null;
  message: string | null;
  wordPoints: number | null;
  textPoints: number | null;
  words: AnswerSheetWritingWord[];
  production: AnswerSheetWritingProduction | null;
  feedback: AnswerSheetWritingFeedback;
  review: AnswerSheetWritingReview | null;
  audit: AnswerSheetWritingAuditEntry[];
}

export interface WritingReviewWord {
  number: number;
  transcription: string;
}

/** POST /written-tests/{id}/writing-reviews. Transcrição vazia conta como em branco. */
export interface WritingReviewPayload {
  studentId: string;
  words?: WritingReviewWord[];
  production?: { transcription: string };
}

export interface WritingReleasePayload {
  studentId: string;
}

export interface ManualWritingWord {
  number: number;
  transcription: string;
  points: number;
  justification: string;
}

/** Os sete critérios saem em camelCase (`usoPagina`). Cada nota é um inteiro de 0 a 2. */
export interface ManualWritingCriteria {
  adequacao: number;
  tipologia: number;
  usoPagina: number;
  ortografia: number;
  pontuacao: number;
  coesao: number;
  segmentacao: number;
}

/** POST /written-tests/{id}/writing-corrections. A resposta já nasce publicada. */
export interface ManualWritingPayload {
  studentId: string;
  words: ManualWritingWord[];
  production: {
    transcription: string;
    criteria: ManualWritingCriteria;
  };
}

/** GET /written-tests/{id}/answer-sheet-corrections — um item por aluno já gravado. */
export interface AnswerSheetSavedStudent {
  correctionId: string | null;
  studentId: string | null;
  studentName: string | null;
  answers: AnswerSheetMarkedAnswer[];
  blank: AnswerSheetOpenAnswer[];
  invalid: AnswerSheetOpenAnswer[];
  crops: AnswerSheetCrop[];
  pages: number[];
  objective: AnswerSheetObjectiveScore | null;
  writing: AnswerSheetWritingScore | null;
}

export interface AnswerSheetCorrectionsList {
  writtenTestId: string;
  students: AnswerSheetSavedStudent[];
}

/* ---------------------------------------------------------------------------------------------------------
 * Leitura guiada automática — `/afirme-reading/guided-auto-sessions` (correção por transcrição no servidor).
 * ------------------------------------------------------------------------------------------------------- */

export type GuidedAutoPart = "words" | "uncommon" | "text";

export type GuidedAutoStatus = "awaiting_audio" | "queued" | "processing" | "completed" | "failed";

export type GuidedAutoMatchType = "correct" | "error" | "omitted" | "extra" | "repeat";

export interface GuidedAutoPartResult {
  wordsRead?: number | null;
  errorsCount?: number | null;
  omittedCount?: number | null;
  extraCount?: number | null;
  correctCount?: number | null;
  accuracy?: number | null;
  plcm?: number | null;
  precisionLevel?: string | null;
  fluencyLevel?: string | null;
  durationSeconds?: number | null;
  transcript?: string | null;
  sttProvider?: string | null;
  sttModel?: string | null;
}

export interface GuidedAutoSession {
  id: string;
  studentId: string;
  studentName?: string | null;
  classId: string | null;
  readingTextId: string | null;
  wordsWordListId: string | null;
  uncommonWordListId: string | null;
  status: GuidedAutoStatus;
  wordsRead: number | null;
  errorsCount: number | null;
  omittedCount: number | null;
  extraCount: number | null;
  durationSeconds: number | null;
  calculatedPlcm: number | null;
  calculatedAccuracy: number | null;
  precisionLevel: string | null;
  fluencyLevel: string | null;
  comprehensionCorrectCount: number | null;
  comprehensionTotal: number | null;
  comprehensionScore: number | null;
  icaScore: number | null;
  icaBreakdown: Record<string, unknown> | null;
  partResults: Partial<Record<GuidedAutoPart, GuidedAutoPartResult>> | null;
  transcriptRaw: string | null;
  sttProvider: string | null;
  sttModel: string | null;
  errorMessage: string | null;
  audioUrl: string | null;
  hasAudio: boolean;
  partAudios: Partial<Record<GuidedAutoPart, unknown>> | null;
  appliedBy: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  answers?: GuidedSessionAnswer[];
}

export interface GuidedAutoWord {
  id: string;
  sessionId: string;
  part: GuidedAutoPart;
  position: number;
  expectedToken: string | null;
  recognizedToken: string | null;
  similarity: number | null;
  matchType: GuidedAutoMatchType;
  startMs: number | null;
  endMs: number | null;
}

/** O backend recusa métricas vindas do cliente: só ids e respostas de compreensão. */
export interface CreateGuidedAutoSessionPayload {
  studentId: string;
  readingTextId?: string;
  wordsWordListId?: string;
  uncommonWordListId?: string;
  answers?: SaveComprehensionAnswerItem[];
}

export interface ListGuidedAutoSessionsParams {
  studentId?: string;
  readingTextId?: string;
  status?: GuidedAutoStatus;
  limit?: number;
}
