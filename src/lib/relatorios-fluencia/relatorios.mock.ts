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
  StatusEstudante,
  TurmaRef,
  TurnoCode,
} from "./types";
import { PARAMETROS_LISTAS } from "./types";

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

function intRange(seed: number, min: number, max: number) {
  return Math.round(min + seeded(seed) * (max - min));
}

function indicadoresIndividuais(
  avaliado: boolean,
  nivel: NivelCode | null,
  ppm: number | null,
  precisao: number | null,
  seed: number
): Pick<
  ResultadoEstudante,
  | "status"
  | "palavrasCorretas"
  | "desconhecidasCorretas"
  | "silabacoes"
  | "soletracoes"
  | "textoPalavrasLidas"
  | "textoErros"
  | "prosodiaAdequada"
  | "compreensaoAcertos"
  | "compreensaoValidas"
> {
  const vazios = {
    palavrasCorretas: 0,
    desconhecidasCorretas: 0,
    silabacoes: 0,
    soletracoes: 0,
    textoPalavrasLidas: 0,
    textoErros: 0,
    prosodiaAdequada: null as boolean | null,
    compreensaoAcertos: 0,
    compreensaoValidas: PARAMETROS_LISTAS.questoesCompreensao,
  };
  if (!avaliado || !nivel) {
    const r = seeded(seed + 20);
    const status: StatusEstudante = r < 0.08 ? "não elegível" : r < 0.55 ? "ausente" : "não avaliado";
    return { status, ...vazios };
  }

  const palavrasPorNivel: Record<NivelCode, [number, number]> = {
    PL1: [0, 8],
    PL2: [8, 22],
    PL3: [20, 40],
    PL4: [40, 62],
    LI: [50, 72],
    LF: [62, 80],
  };
  const descPorNivel: Record<NivelCode, [number, number]> = {
    PL1: [0, 4],
    PL2: [3, 12],
    PL3: [10, 25],
    PL4: [20, 40],
    LI: [30, 52],
    LF: [40, 60],
  };
  const compPorNivel: Record<NivelCode, [number, number]> = {
    PL1: [0, 1],
    PL2: [1, 2],
    PL3: [1, 3],
    PL4: [2, 3],
    LI: [2, 4],
    LF: [3, 4],
  };

  const palavrasCorretas = intRange(seed + 21, ...palavrasPorNivel[nivel]);
  const desconhecidasCorretas = intRange(seed + 22, ...descPorNivel[nivel]);
  const textoPalavrasLidas = ppm ?? intRange(seed + 23, 10, 90);
  const textoErros = Math.max(0, Math.round(textoPalavrasLidas * (1 - (precisao ?? 70) / 100)));
  const compreensaoAcertos = intRange(seed + 24, ...compPorNivel[nivel]);

  return {
    status: "presente",
    palavrasCorretas,
    desconhecidasCorretas,
    silabacoes: intRange(seed + 25, nivel === "PL1" || nivel === "PL2" ? 2 : 0, nivel === "LF" ? 1 : 8),
    soletracoes: intRange(seed + 26, nivel === "PL1" ? 1 : 0, nivel === "LF" ? 1 : 6),
    textoPalavrasLidas,
    textoErros,
    prosodiaAdequada: nivel === "LF" || nivel === "LI" ? seeded(seed + 27) > 0.25 : seeded(seed + 27) > 0.7,
    compreensaoAcertos,
    compreensaoValidas: PARAMETROS_LISTAS.questoesCompreensao,
  };
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
        const rede = MOCK_REDES.find((r) => r.id === (mun?.redeId ?? "rede-1"));
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

        const ppm = nivelFinal ? ppmFor(nivelFinal, seed) : null;
        const precisao = nivelFinal ? precisaoFor(nivelFinal, seed) : null;

        out.push({
          id: `${student.id}-${ano}-${edicao}`,
          nome: student.name,
          matricula: `2024${student.id.replace(/\D/g, "").padStart(4, "0")}`,
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
          redeNome: rede?.nome ?? "Rede Municipal",
          municipioNome: mun?.nome ?? "",
          avaliado,
          nivel: nivelFinal,
          ppm,
          precisao,
          ...indicadoresIndividuais(avaliado, nivelFinal, ppm, precisao, seed),
        });
      }
    }
  }

  return out;
}

export const MOCK_RESULTADOS: ResultadoEstudante[] = buildResultados();

const EDICAO_ORDEM: EdicaoCode[] = ["entrada", "formativa", "saida"];

export function studentBaseIdFromId(id: string) {
  return id.replace(/-\d{4}-(entrada|formativa|saida)$/, "");
}

export function studentBaseIdFromResultado(resultado: ResultadoEstudante) {
  return studentBaseIdFromId(resultado.id);
}

/** Histórico mock por aluno — trocar depois por API de sessões. */
export function getHistoricoEstudanteMock(opts: {
  studentId?: string;
  nome?: string;
  ano?: number;
}): ResultadoEstudante[] {
  let list = MOCK_RESULTADOS;
  if (opts.studentId) {
    const base = studentBaseIdFromId(opts.studentId);
    const byId = list.filter(
      (r) =>
        studentBaseIdFromResultado(r) === base ||
        r.id === opts.studentId ||
        r.id.startsWith(`${base}-`)
    );
    list = byId.length > 0 ? byId : opts.nome ? list.filter((r) => r.nome === opts.nome) : [];
  } else if (opts.nome) {
    list = list.filter((r) => r.nome === opts.nome);
  }
  if (opts.ano) list = list.filter((r) => r.ano === opts.ano);
  return [...list].sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;
    return EDICAO_ORDEM.indexOf(a.edicao) - EDICAO_ORDEM.indexOf(b.edicao);
  });
}

export function participacaoTurmaNaEdicao(resultado: ResultadoEstudante) {
  const peers = MOCK_RESULTADOS.filter(
    (r) => r.turmaId === resultado.turmaId && r.ano === resultado.ano && r.edicao === resultado.edicao
  );
  if (peers.length === 0) return 0;
  const avaliados = peers.filter((r) => r.avaliado).length;
  return Math.round((avaliados / peers.length) * 1000) / 10;
}

export function fraseAnaliticaEdicao(resultado: ResultadoEstudante) {
  if (!resultado.avaliado || !resultado.nivel) {
    return "Estudante ainda não avaliado nesta edição.";
  }
  const label =
    resultado.nivel === "LI"
      ? "Leitor Iniciante"
      : resultado.nivel === "LF"
        ? "Leitor Fluente"
        : resultado.nivel;
  return `Classificado como ${label}, com PPM ${resultado.ppm ?? "—"} e precisão ${resultado.precisao ?? "—"}%.`;
}

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
