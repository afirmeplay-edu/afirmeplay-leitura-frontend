export type WordListKind = "PALAVRAS" | "POUCO_COMUNS";

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateWordListPayload {
  name: string;
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
  studentId: string;
  classId: string;
  schoolId: string;
  readingTextId: string;
  wordsWordListId?: string | null;
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
  wordsWordListId: string | null;
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

export type ReadingAssessmentType = "fluencia" | "compreensao" | "completa";

export interface ReadingEvaluation {
  id: string;
  title: string;
  description: string | null;
  readingTextId: string;
  wordsWordListId: string | null;
  uncommonWordListId: string | null;
  gradeId: string | null;
  grade?: GradeRef | null;
  classIds: string[];
  schoolIds: string[];
  assessmentType: ReadingAssessmentType;
  status: ReadingEvaluationStatus;
  applicationStart: string | null;
  applicationEnd: string | null;
  timezone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sessions?: ReadingEvaluationSession[];
}

export interface ListReadingEvaluationsParams {
  status?: ReadingEvaluationStatus;
  assessmentType?: ReadingAssessmentType;
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
