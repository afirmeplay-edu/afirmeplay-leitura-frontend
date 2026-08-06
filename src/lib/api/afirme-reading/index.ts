export { afirmeReadingApi } from "@/lib/api/afirme-reading/client";
export {
  listWordLists,
  getWordList,
  createWordList,
  updateWordList,
  deleteWordList,
} from "@/lib/api/afirme-reading/word-lists";
export {
  listReadingTexts,
  getReadingText,
  createReadingText,
  updateReadingText,
  deleteReadingText,
} from "@/lib/api/afirme-reading/texts";
export {
  createGuidedSession,
  listGuidedSessions,
  getGuidedSession,
  uploadGuidedSessionAudio,
  deleteGuidedSession,
  toProxiedAudioUrl,
  fetchGuidedAudioObjectUrl,
  resolveGuidedSessionAudioUrl,
} from "@/lib/api/afirme-reading/guided-sessions";
export type {
  WordList,
  WordListKind,
  ScopeType,
  DifficultyLevel,
  CreateWordListPayload,
  UpdateWordListPayload,
  ListWordListsParams,
  ReadingText,
  ReadingQuestion,
  GradeRef,
  CreateReadingTextPayload,
  UpdateReadingTextPayload,
  ListReadingTextsParams,
  Grade,
  EducationStage,
  GuidedSession,
  GuidedSessionAnswer,
  CreateGuidedSessionPayload,
  ListGuidedSessionsParams,
  ApiErrorBody,
} from "@/lib/api/afirme-reading/types";
