/**
 * Mock isolado do Relatório de Fluência.
 * Trocar depois por chamada à API real sem reescrever a tela.
 */
import { getMockClasses } from "@/lib/mock/classes";
import { getMockSchools } from "@/lib/mock/schools";
import { getMockStudents } from "@/lib/mock/students";
import type {
  EdicaoCode,
  EscolaRef,
  Municipio,
  NivelCode,
  Rede,
  ResultadoEstudante,
  SerieRef,
  TurmaRef,
  TurnoCode,
} from "./types";

export const MOCK_ANOS = [2024, 2025, 2026];

export const MOCK_REDES: Rede[] = [
  { id: "rede-1", nome: "Rede Municipal" },
  { id: "rede-2", nome: "Rede Estadual" },
];

export const MOCK_MUNICIPIOS: Municipio[] = [
  { id: "mun-1", redeId: "rede-1", nome: "Campina Grande" },
  { id: "mun-2", redeId: "rede-1", nome: "Patos" },
  { id: "mun-3", redeId: "rede-2", nome: "João Pessoa" },
];

const CITY_TO_MUN: Record<string, string> = {
  "Campina Grande": "mun-1",
  Patos: "mun-2",
};

function serieIdFromGrade(grade: string): string {
  return `serie-${grade}`;
}

export const MOCK_SERIES: SerieRef[] = [
  { id: "serie-2", nome: "2º Ano" },
  { id: "serie-3", nome: "3º Ano" },
  { id: "serie-4", nome: "4º Ano" },
  { id: "serie-5", nome: "5º Ano" },
];

export const MOCK_ESCOLAS: EscolaRef[] = getMockSchools().map((s) => ({
  id: s.id,
  municipioId: CITY_TO_MUN[s.city] ?? "mun-1",
  nome: s.name,
}));

export const MOCK_TURMAS: TurmaRef[] = getMockClasses().map((c) => ({
  id: c.id,
  escolaId: c.schoolId,
  serieId: serieIdFromGrade(c.grade),
  nome: c.name,
  turno: c.shift as TurnoCode,
}));

const NIVEIS_POOL: NivelCode[] = ["PL1", "PL2", "PL3", "PL4", "LI", "LF"];

/** Seed determinístico para mock estável. */
function seeded(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function nivelFor(seed: number): NivelCode {
  const idx = Math.floor(seeded(seed) * NIVEIS_POOL.length);
  return NIVEIS_POOL[Math.min(idx, NIVEIS_POOL.length - 1)];
}

function ppmFor(nivel: NivelCode, seed: number): number {
  const base: Record<NivelCode, [number, number]> = {
    PL1: [5, 20],
    PL2: [15, 35],
    PL3: [30, 50],
    PL4: [45, 65],
    LI: [55, 75],
    LF: [70, 110],
  };
  const [min, max] = base[nivel];
  return Math.round(min + seeded(seed + 1) * (max - min));
}

function precisaoFor(nivel: NivelCode, seed: number): number {
  const base: Record<NivelCode, [number, number]> = {
    PL1: [40, 65],
    PL2: [55, 75],
    PL3: [65, 82],
    PL4: [75, 90],
    LI: [85, 95],
    LF: [90, 100],
  };
  const [min, max] = base[nivel];
  return Math.round(min + seeded(seed + 2) * (max - min));
}

function buildResultados(): ResultadoEstudante[] {
  const students = getMockStudents();
  const escolas = new Map(MOCK_ESCOLAS.map((e) => [e.id, e]));
  const turmas = new Map(MOCK_TURMAS.map((t) => [t.id, t]));
  const series = new Map(MOCK_SERIES.map((s) => [s.id, s]));
  const edicoes: EdicaoCode[] = ["entrada", "formativa", "saida"];
  const anos = [2025, 2026];
  const out: ResultadoEstudante[] = [];
  let seq = 0;

  for (const ano of anos) {
    for (const edicao of edicoes) {
      for (const student of students) {
        seq += 1;
        const turma = turmas.get(student.classId);
        const escola = escolas.get(student.schoolId);
        if (!turma || !escola) continue;

        const mun = MOCK_MUNICIPIOS.find((m) => m.id === escola.municipioId);
        const seed = seq + ano * 17 + (edicao === "entrada" ? 1 : edicao === "formativa" ? 3 : 5);
        // ~15% não avaliados na formativa; menos na saída
        const skipRate = edicao === "entrada" ? 0.08 : edicao === "formativa" ? 0.15 : 0.05;
        const avaliado = seeded(seed + 9) > skipRate;
        const nivel = avaliado ? nivelFor(seed) : null;

        // Progressão leve entre edições (seed maior → tendência a níveis melhores)
        let nivelFinal = nivel;
        if (avaliado && nivel && edicao !== "entrada") {
          const bump = Math.floor(seeded(seed + 11) * 2);
          const idx = NIVEIS_POOL.indexOf(nivel);
          nivelFinal = NIVEIS_POOL[Math.min(idx + bump, NIVEIS_POOL.length - 1)];
        }

        out.push({
          id: `${student.id}-${ano}-${edicao}`,
          nome: student.name,
          matricula: `2024${String(seq).padStart(4, "0")}`,
          escolaId: escola.id,
          escolaNome: escola.nome,
          turmaId: turma.id,
          turmaNome: turma.nome,
          serieId: turma.serieId,
          serieNome: series.get(turma.serieId)?.nome ?? turma.serieId,
          turno: turma.turno,
          ano,
          edicao,
          redeId: mun?.redeId ?? "rede-1",
          municipioId: escola.municipioId,
          avaliado,
          nivel: nivelFinal,
          ppm: nivelFinal ? ppmFor(nivelFinal, seed) : null,
          precisao: nivelFinal ? precisaoFor(nivelFinal, seed) : null,
        });
      }
    }
  }

  return out;
}

export const MOCK_RESULTADOS: ResultadoEstudante[] = buildResultados();

/** Ponto único de acesso — trocar por fetch da API depois. */
export function getRelatoriosFluenciaMock() {
  return {
    anos: MOCK_ANOS,
    redes: MOCK_REDES,
    municipios: MOCK_MUNICIPIOS,
    escolas: MOCK_ESCOLAS,
    series: MOCK_SERIES,
    turmas: MOCK_TURMAS,
    resultados: MOCK_RESULTADOS,
  };
}
