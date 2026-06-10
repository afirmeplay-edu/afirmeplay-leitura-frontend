import type { IcaReportStudent } from "./types";

export const MOCK_ICA_STUDENTS: IcaReportStudent[] = [
  { id: "alu-1", name: "Ana Beatriz Santos", className: "3º Ano A", icaScore: 285, level: "Adequado", evaluated: true },
  { id: "alu-2", name: "Bruno Costa Lima", className: "3º Ano A", icaScore: 220, level: "Básico", evaluated: true },
  { id: "alu-3", name: "Carla Mendes", className: "3º Ano A", icaScore: 0, level: "Sem ICA", evaluated: false },
  { id: "alu-4", name: "Daniel Oliveira", className: "3º Ano B", icaScore: 195, level: "Básico", evaluated: true },
  { id: "alu-5", name: "Eduarda Ferreira", className: "3º Ano B", icaScore: 310, level: "Avançado", evaluated: true },
  { id: "alu-6", name: "Felipe Alves", className: "4º Ano A", icaScore: 340, level: "Avançado", evaluated: true },
  { id: "alu-7", name: "Gabriela Rocha", className: "4º Ano A", icaScore: 180, level: "Abaixo do básico", evaluated: true },
  { id: "alu-8", name: "Henrique Souza", className: "5º Ano A", icaScore: 350, level: "Avançado", evaluated: true },
  { id: "alu-10", name: "João Pedro", className: "2º Ano A", icaScore: 150, level: "Abaixo do básico", evaluated: true },
  { id: "alu-13", name: "Natália Dias", className: "3º Ano A", icaScore: 270, level: "Adequado", evaluated: true },
];

export const MOCK_ICA_SUMMARY = {
  eligible: 120,
  evaluated: 98,
  participationRate: 81.7,
  withoutIca: 22,
  average: 248,
  median: 255,
  min: 150,
  max: 350,
  management: "Municipal",
};

export const MOCK_ICA_LEVELS = [
  { level: "Abaixo do básico", count: 12, percentage: 12.2 },
  { level: "Básico", count: 28, percentage: 28.6 },
  { level: "Adequado", count: 35, percentage: 35.7 },
  { level: "Avançado", count: 23, percentage: 23.5 },
];

export const MOCK_TECHNICAL_OPINION =
  "Com base nos resultados do Índice Criança Alfabetizada (ICA), observa-se que 35,7% dos estudantes avaliados encontram-se no nível Adequado, indicando progresso na alfabetização. Recomenda-se intensificar intervenções pedagógicas para os 12,2% classificados como Abaixo do básico, com foco em fluência e compreensão leitora.";

export function getMockIcaReport() {
  return {
    students: MOCK_ICA_STUDENTS,
    summary: MOCK_ICA_SUMMARY,
    levels: MOCK_ICA_LEVELS,
    opinion: MOCK_TECHNICAL_OPINION,
  };
}
