export interface School {
  id: string;
  name: string;
  city: string;
  inep: string;
  active: boolean;
}

export interface ClassGroup {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  shift: string;
  studentCount: number;
}

export interface Student {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  email?: string;
  birthDate?: string;
  gender?: string;
}

export interface ReadingQuestion {
  id: string;
  text: string;
  descriptor: string;
  options: string[];
  correctIndex: number;
}

export interface ReadingText {
  id: string;
  title: string;
  grade: string;
  difficulty: "facil" | "medio" | "dificil";
  content: string;
  source?: string;
  calibrated: boolean;
  questions: ReadingQuestion[];
}

export interface WordList {
  id: string;
  name: string;
  type: "PALAVRAS" | "POUCO_COMUNS";
  items: string[];
  isDefault: boolean;
  active: boolean;
}

export interface AppliedEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  schoolName: string;
  textTitle: string;
  date: string;
  plcm: number;
  accuracy: number;
  prosody: number;
  icaLevel?: number;
  type: "fluencia" | "guiada";
}

export interface IcaReportStudent {
  id: string;
  name: string;
  className: string;
  icaScore: number;
  level: string;
  evaluated: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "professor" | "diretor" | "coordenador";
  active: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
