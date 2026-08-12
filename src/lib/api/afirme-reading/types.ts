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

export interface CreateReadingTextPayload {
  title: string;
  content: string;
  gradeId: string;
  difficultyLevel: DifficultyLevel;
  targetSkills?: string[];
  source?: string | null;
  isCalibrated?: boolean;
}

export type UpdateReadingTextPayload = Partial<CreateReadingTextPayload>;

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

export interface FluencyPartPayload {
  wordsRead: number;
  errorsCount: number;
  readingTimeSeconds: number;
  transcript?: string;
  markings?: unknown[];
  overrides?: Record<string, unknown>;
}

export interface SaveFluencyPayload {
  kind: "FLUENCY";
  caderno: string;
  notReadReason: string | null;
  prosodyLevel: number;
  /** Partes opcionais para salvamento incremental (Q1 → Q2 → Q3). */
  q1?: FluencyPartPayload;
  q2?: Pick<FluencyPartPayload, "wordsRead" | "errorsCount" | "readingTimeSeconds">;
  q3?: Pick<FluencyPartPayload, "wordsRead" | "errorsCount" | "readingTimeSeconds">;
  extras?: {
    sttProvider?: string;
    notes?: string;
  };
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
  errorsCount?: number;
  readingTimeSeconds?: number;
  accuracy?: number | null;
  plcm?: number | null;
  precisionLevel?: string | null;
  fluencyLevel?: string | null;
  [key: string]: unknown;
}

export interface FluencySessionReport {
  evaluationId: string;
  evaluationTitle: string;
  assessmentType: string;
  sessionId: string;
  studentId: string;
  studentName: string | null;
  classId: string | null;
  status: ReadingSessionStatus;
  readingTextId: string | null;
  wordsWordListId: string | null;
  uncommonWordListId: string | null;
  q1: FluencyPartReport | null;
  q2: FluencyPartReport | null;
  q3: FluencyPartReport | null;
  prosodyLevel: number | null;
  caderno: string | null;
  notReadReason: string | null;
  extras: Record<string, unknown>;
  comprehension: {
    correctCount: number | null;
    total: number | null;
    score: number | null;
    answers: ReadingComprehensionAnswer[];
  };
  calculatedPlcm: number | null;
  calculatedAccuracy: number | null;
  precisionLevel: string | null;
  fluencyLevel: string | null;
  icaScore: number | null;
  icaBreakdown: Record<string, unknown> | null;
  startedAt: string | null;
  submittedAt: string | null;
}
