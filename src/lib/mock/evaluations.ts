import type { AppliedEvaluation } from "./types";

export const MOCK_EVALUATIONS: AppliedEvaluation[] = [
  { id: "av-1", studentId: "alu-1", studentName: "Ana Beatriz Santos", className: "3º Ano A", schoolName: "EMEF Prof. Maria Silva", textTitle: "O Gato e o Rato", date: "2026-05-10", plcm: 85, accuracy: 92, prosody: 4, icaLevel: 4, type: "fluencia" },
  { id: "av-2", studentId: "alu-2", studentName: "Bruno Costa Lima", className: "3º Ano A", schoolName: "EMEF Prof. Maria Silva", textTitle: "O Gato e o Rato", date: "2026-05-10", plcm: 72, accuracy: 78, prosody: 3, icaLevel: 3, type: "fluencia" },
  { id: "av-3", studentId: "alu-6", studentName: "Felipe Alves", className: "4º Ano A", schoolName: "EMEF Dom Pedro II", textTitle: "A Viagem de Pedro", date: "2026-05-08", plcm: 90, accuracy: 95, prosody: 5, icaLevel: 5, type: "guiada" },
  { id: "av-4", studentId: "alu-7", studentName: "Gabriela Rocha", className: "4º Ano A", schoolName: "EMEF Dom Pedro II", textTitle: "A Viagem de Pedro", date: "2026-05-08", plcm: 68, accuracy: 70, prosody: 3, icaLevel: 2, type: "guiada" },
  { id: "av-5", studentId: "alu-8", studentName: "Henrique Souza", className: "5º Ano A", schoolName: "EMEF Dom Pedro II", textTitle: "As Estações do Ano", date: "2026-05-05", plcm: 95, accuracy: 98, prosody: 5, icaLevel: 5, type: "fluencia" },
  { id: "av-6", studentId: "alu-10", studentName: "João Pedro", className: "2º Ano A", schoolName: "EMEF José da Penha", textTitle: "A Festa na Escola", date: "2026-05-03", plcm: 55, accuracy: 60, prosody: 2, icaLevel: 1, type: "guiada" },
  { id: "av-7", studentId: "alu-13", studentName: "Natália Dias", className: "3º Ano A", schoolName: "EMEF Prof. Maria Silva", textTitle: "O Gato e o Rato", date: "2026-05-11", plcm: 80, accuracy: 88, prosody: 4, icaLevel: 4, type: "guiada" },
  { id: "av-8", studentId: "alu-15", studentName: "Paula Vieira", className: "4º Ano A", schoolName: "EMEF Dom Pedro II", textTitle: "A Viagem de Pedro", date: "2026-05-07", plcm: 75, accuracy: 82, prosody: 3, icaLevel: 3, type: "fluencia" },
  { id: "av-9", studentId: "alu-16", studentName: "Rafael Gomes", className: "5º Ano A", schoolName: "EMEF Dom Pedro II", textTitle: "O Planeta Terra", date: "2026-05-01", plcm: 88, accuracy: 90, prosody: 4, icaLevel: 4, type: "fluencia" },
  { id: "av-10", studentId: "alu-19", studentName: "Valentina Cruz", className: "3º Ano A", schoolName: "EMEF Prof. Maria Silva", textTitle: "O Gato e o Rato", date: "2026-05-12", plcm: 78, accuracy: 85, prosody: 4, icaLevel: 3, type: "guiada" },
];

export function getMockEvaluations() {
  return MOCK_EVALUATIONS;
}

export function getMockEvaluationById(id: string) {
  return MOCK_EVALUATIONS.find((e) => e.id === id);
}
