/** Tipos e constantes do Relatório de Fluência (mock / MVP). */

import { getPerfilLeitorStyle, type PerfilLeitorCode } from "@/lib/colors/reading-levels";

export type NivelCode = PerfilLeitorCode;

export type EdicaoCode = "entrada" | "formativa" | "saida";

export type TurnoCode = "Matutino" | "Vespertino" | "Noturno" | "Integral";

export type RelatorioPor = "escola" | "turma" | "estudante";

export type StatusEstudante = "presente" | "ausente" | "não avaliado" | "não elegível";

export const EDICOES_ORDEM: EdicaoCode[] = ["entrada", "formativa", "saida"];

/** Totais das listas/texto usados na tabela nominal (mock, iguais ao MVP). */
export const PARAMETROS_LISTAS = {
  totalPalavras: 80,
  totalDesconhecidas: 60,
  questoesCompreensao: 4,
} as const;

export const NIVEIS: {
  code: NivelCode;
  label: string;
  short: string;
  pesoIfl: number;
}[] = [
  { code: "PL1", label: "PL1", short: "PL1", pesoIfl: 0 },
  { code: "PL2", label: "PL2", short: "PL2", pesoIfl: 20 },
  { code: "PL3", label: "PL3", short: "PL3", pesoIfl: 40 },
  { code: "PL4", label: "PL4", short: "PL4", pesoIfl: 60 },
  { code: "LI", label: "Leitor Iniciante", short: "LI", pesoIfl: 80 },
  { code: "LF", label: "Leitor Fluente", short: "LF", pesoIfl: 100 },
];

/** Cores do perfil leitor — mesma paleta ICA 1–6. */
export const NIVEL_COLOR: Record<NivelCode, string> = {
  PL1: getPerfilLeitorStyle("PL1").hex,
  PL2: getPerfilLeitorStyle("PL2").hex,
  PL3: getPerfilLeitorStyle("PL3").hex,
  PL4: getPerfilLeitorStyle("PL4").hex,
  LI: getPerfilLeitorStyle("LI").hex,
  LF: getPerfilLeitorStyle("LF").hex,
};

export const EDICAO_LABEL: Record<EdicaoCode, string> = {
  entrada: "Avaliação de Entrada",
  formativa: "Avaliação Formativa",
  saida: "Avaliação de Saída",
};

export const EDICAO_ANTERIOR: Partial<Record<EdicaoCode, EdicaoCode>> = {
  formativa: "entrada",
  saida: "formativa",
};

export const PRE_LEITORES: NivelCode[] = ["PL1", "PL2", "PL3", "PL4"];
export const LEITORES_FLUENTES: NivelCode[] = ["LF"];

/** Critério de fluência exibido no rodapé (PPM). */
export const CRITERIO_FLUENCIA =
  "Leitor Fluente: PPM ≥ 70 e precisão ≥ 90%. Pré-leitores: PL1–PL4 conforme desempenho em listas e texto.";

export interface Rede {
  id: string;
  nome: string;
}

export interface Municipio {
  id: string;
  redeId: string;
  nome: string;
}

export interface EscolaRef {
  id: string;
  municipioId: string;
  nome: string;
}

export interface SerieRef {
  id: string;
  nome: string;
}

export interface TurmaRef {
  id: string;
  escolaId: string;
  serieId: string;
  nome: string;
  turno: TurnoCode;
}

export interface ResultadoEstudante {
  id: string;
  nome: string;
  matricula: string;
  escolaId: string;
  escolaNome: string;
  turmaId: string;
  turmaNome: string;
  serieId: string;
  serieNome: string;
  turno: TurnoCode;
  ano: number;
  edicao: EdicaoCode;
  redeId: string;
  municipioId: string;
  redeNome: string;
  municipioNome: string;
  /** false = previsto, ainda não avaliado */
  avaliado: boolean;
  status: StatusEstudante;
  nivel: NivelCode | null;
  ppm: number | null;
  precisao: number | null;
  palavrasCorretas: number;
  desconhecidasCorretas: number;
  silabacoes: number;
  soletracoes: number;
  textoPalavrasLidas: number;
  textoErros: number;
  prosodiaAdequada: boolean | null;
  compreensaoAcertos: number;
  compreensaoValidas: number;
}

export interface FiltrosRelatorio {
  ano: number;
  edicao: EdicaoCode;
  redeId: string; // "" = Todos
  municipioId: string;
  escolaId: string;
  serieId: string;
  turmaId: string;
  turno: string; // "" = Todos
}

export interface DistribuicaoNivel {
  code: NivelCode;
  label: string;
  estudantes: number;
  percentual: number;
  percentualAnterior: number | null;
  delta: number | null;
  lista: { id: string; nome: string; turmaNome: string }[];
}

export interface Indicadores {
  previstos: number;
  avaliados: number;
  participacao: number;
  ifl: number;
  leitoresFluentesPct: number;
  preLeitoresPct: number;
  ppmMedio: number;
  precisaoMedia: number;
  distribuicao: DistribuicaoNivel[];
}

export interface ResumoEscola extends Indicadores {
  escolaId: string;
  escolaNome: string;
}

export interface ResumoTurma extends Indicadores {
  turmaId: string;
  turmaNome: string;
  escolaNome: string;
}

export interface RelatorioComputado {
  filtros: FiltrosRelatorio;
  escopoLabel: string;
  tituloEdicao: string;
  emitidoEm: Date;
  indicadores: Indicadores;
  indicadoresAnteriores: Indicadores | null;
  porEscola: ResumoEscola[];
  porTurma: ResumoTurma[];
  leituraAnalitica: string;
  alertas: { id: string; severidade: "info" | "warning" | "critical"; titulo: string; descricao: string; nivelCode?: string | null }[];
  resultados: ResultadoEstudante[];
}
