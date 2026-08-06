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
