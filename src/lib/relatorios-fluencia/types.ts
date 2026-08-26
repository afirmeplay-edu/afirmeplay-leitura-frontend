/** Tipos do Relatório de Fluência — contrato GET /afirme-reading/resultados. */

import { getPerfilLeitorStyle, type PerfilLeitorCode } from "@/lib/colors/reading-levels";

export type NivelCode = PerfilLeitorCode;

export type EdicaoCode = "entrada" | "formativa" | "saida";

export type TurnoCode = "Matutino" | "Vespertino" | "Noturno" | "Integral";

export type RelatorioPor = "escola" | "turma" | "estudante";

export type RelatorioPorRecorte = "escola" | "turma";

export type StatusEstudante = "presente" | "ausente" | "não avaliado" | "não elegível";

export type EvolucaoCode = "avanco" | "regressao" | "manutencao";

export const EDICOES_ORDEM: EdicaoCode[] = ["entrada", "formativa", "saida"];

/** Ordem visual PL1–LF. Pesos só documentam o contrato; o front não calcula IFL. */
export const NIVEIS: {
  code: NivelCode;
  label: string;
  short: string;
  pesoIfl: number;
}[] = [
  { code: "PL1", label: "PL1", short: "PL1", pesoIfl: 0 },
  { code: "PL2", label: "PL2", short: "PL2", pesoIfl: 1 },
  { code: "PL3", label: "PL3", short: "PL3", pesoIfl: 2.5 },
  { code: "PL4", label: "PL4", short: "PL4", pesoIfl: 4 },
  { code: "LI", label: "Leitor Iniciante", short: "LI", pesoIfl: 6 },
  { code: "LF", label: "Leitor Fluente", short: "LF", pesoIfl: 10 },
];

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

export interface EdicaoRef {
  id: EdicaoCode;
  label: string;
}

export interface AvaliacaoFiltro {
  id: string;
  titulo: string;
  ano: number;
  edicao: EdicaoCode;
  edicaoLabel?: string;
  status: string;
  escolaIds: string[];
  serieIds: string[];
  turmaIds: string[];
}

export interface CatalogoFiltrosRelatorio {
  anos: number[];
  edicoes: EdicaoRef[];
  avaliacoes: AvaliacaoFiltro[];
  redes: Rede[];
  municipios: Municipio[];
  escolas: EscolaRef[];
  series: SerieRef[];
  turmas: TurmaRef[];
}

export interface FiltrosRelatorio {
  ano: number;
  edicao: EdicaoCode;
  avaliacaoId: string;
  redeId: string;
  municipioId: string;
  escolaId: string;
  serieId: string;
  turmaId: string;
  turno: string;
}

export interface ListResultadosQuery extends FiltrosRelatorio {
  por?: RelatorioPorRecorte;
  itemId?: string;
}

export interface CriteriosRelatorio {
  pesosIfl: string;
  iflDescricao: string;
  fluencia: string;
}

export interface AlunoDistribuicao {
  id: string;
  nome: string;
  turmaNome: string;
}

export interface DistribuicaoNivel {
  code: NivelCode;
  label: string;
  estudantes: number;
  percentual: number;
  percentualAnterior: number | null;
  delta: number | null;
  lista: AlunoDistribuicao[];
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
  velocidadeAdequadaPct?: number;
  precisaoAdequadaPct?: number;
  prosodiaAdequadaPct?: number;
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

export interface AlertaPedagogico {
  id: string;
  severidade: "info" | "warning" | "critical";
  titulo: string;
  descricao: string;
  nivelCode?: NivelCode | string | null;
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
  avaliado: boolean;
  status: StatusEstudante;
  nivel: NivelCode | null;
  nivelLabel: string;
  nivelAnterior: NivelCode | null;
  nivelAnteriorLabel: string;
  evolucao: EvolucaoCode | null;
  ppm: number | null;
  precisao: number | null;
  prosodiaAdequada: boolean | null;
  prosodiaLabel: string;
  pesoIfl: number | null;
  palavrasCorretas: number;
  totalPalavras: number;
  desconhecidasCorretas: number;
  totalDesconhecidas: number;
  silabacoes: number;
  soletracoes: number;
  textoPalavrasLidas: number;
  textoErros: number;
  compreensaoAcertos: number;
  compreensaoValidas: number;
  compreensaoPct: number | null;
}

export interface RelatorioResultados {
  avaliacaoId?: string;
  avaliacaoTitulo?: string;
  avaliacaoStatus?: string;
  ano?: number;
  edicao?: EdicaoCode;
  tituloEdicao: string;
  escopoLabel: string;
  emitidoEm: string;
  criterios: CriteriosRelatorio;
  indicadores: Indicadores;
  indicadoresAnteriores: Indicadores | null;
  leituraAnalitica: string;
  alertas: AlertaPedagogico[];
  porEscola: ResumoEscola[];
  porTurma: ResumoTurma[];
  estudantes: ResultadoEstudante[];
}

export interface LinhaDoTempoEdicao {
  edicao: EdicaoCode;
  edicaoLabel: string;
  nivel: NivelCode | null;
  nivelLabel: string;
  resultado: ResultadoEstudante | null;
}

export interface ExportacaoPerfilEstudante {
  iflDoNivel: number | null;
  participacaoTurmaPct: number | null;
  fraseAnalitica: string;
}

export interface PerfilEstudanteRelatorio {
  id: string;
  nome: string;
  matricula: string;
  escolaNome: string;
  turmaNome: string;
  turno: TurnoCode | string;
  serieNome: string;
  municipioNome: string;
  redeNome: string;
  ano: number;
  linhaDoTempo: LinhaDoTempoEdicao[];
  perfilAnterior: NivelCode | null;
  perfilAtual: NivelCode | null;
  evolucao: EvolucaoCode | null;
  exportacao: ExportacaoPerfilEstudante;
}

export const CATALOGO_VAZIO: CatalogoFiltrosRelatorio = {
  anos: [],
  edicoes: [],
  avaliacoes: [],
  redes: [],
  municipios: [],
  escolas: [],
  series: [],
  turmas: [],
};

export function avaliacoesDoFiltro(
  catalog: CatalogoFiltrosRelatorio,
  ano: number,
  edicao: EdicaoCode
): AvaliacaoFiltro[] {
  return (catalog.avaliacoes ?? []).filter(
    (a) => a.id && a.ano === ano && a.edicao === edicao
  );
}
