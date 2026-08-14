import type { Indicadores } from "./types";
import { NIVEIS } from "./types";

export type AlertaPedagogico = {
  id: string;
  severidade: "info" | "warning" | "critical";
  titulo: string;
  descricao: string;
};

export function gerarLeituraAnalitica(
  ind: Indicadores,
  anterior: Indicadores | null,
  edicaoLabel: string
): string {
  const maior = [...ind.distribuicao].sort((a, b) => b.estudantes - a.estudantes)[0];
  const maiorLabel = maior?.label ?? "—";
  const maiorPct = maior?.percentual ?? 0;

  let texto =
    `Na ${edicaoLabel.toLowerCase()}, foram previstos ${ind.previstos} estudantes, ` +
    `dos quais ${ind.avaliados} foram avaliados (participação de ${ind.participacao}%). ` +
    `O IFL do escopo selecionado é ${ind.ifl}. `;

  texto +=
    `A maior concentração está em ${maiorLabel} (${maiorPct}%). ` +
    `Leitores fluentes representam ${ind.leitoresFluentesPct}% e pré-leitores ${ind.preLeitoresPct}% ` +
    `dos avaliados. O PPM médio é ${ind.ppmMedio} e a precisão média ${ind.precisaoMedia}%.`;

  if (anterior) {
    const deltaIfl = Math.round((ind.ifl - anterior.ifl) * 10) / 10;
    const sinal = deltaIfl > 0 ? "aumento" : deltaIfl < 0 ? "redução" : "estabilidade";
    texto +=
      ` Em relação à edição anterior, observa-se ${sinal} do IFL` +
      (deltaIfl !== 0 ? ` de ${Math.abs(deltaIfl)} pontos` : "") +
      ` (de ${anterior.ifl} para ${ind.ifl}).`;
  }

  return texto;
}

export function gerarAlertas(ind: Indicadores, anterior: Indicadores | null): AlertaPedagogico[] {
  const alertas: AlertaPedagogico[] = [];

  if (ind.participacao < 80) {
    alertas.push({
      id: "participacao-baixa",
      severidade: ind.participacao < 60 ? "critical" : "warning",
      titulo: "Participação abaixo do esperado",
      descricao: `A participação está em ${ind.participacao}%. Recomenda-se retomar a aplicação com os estudantes previstos ainda não avaliados.`,
    });
  }

  if (ind.preLeitoresPct >= 40) {
    alertas.push({
      id: "pre-leitores-alto",
      severidade: ind.preLeitoresPct >= 55 ? "critical" : "warning",
      titulo: "Alta proporção de pré-leitores",
      descricao: `${ind.preLeitoresPct}% dos avaliados estão em PL1–PL4. Priorize intervenção em consciência fonológica e fluência básica.`,
    });
  }

  if (ind.leitoresFluentesPct < 20 && ind.avaliados >= 5) {
    alertas.push({
      id: "fluentes-baixo",
      severidade: "warning",
      titulo: "Poucos leitores fluentes",
      descricao: `Apenas ${ind.leitoresFluentesPct}% alcançaram o nível Leitor Fluente. Intensifique práticas de leitura oral cronometrada e modelagem.`,
    });
  }

  const pl1 = ind.distribuicao.find((d) => d.code === "PL1");
  if (pl1 && pl1.percentual >= 15) {
    alertas.push({
      id: "pl1-concentracao",
      severidade: "critical",
      titulo: "Concentração em PL1",
      descricao: `${pl1.percentual}% dos avaliados estão em PL1. Esses estudantes precisam de acompanhamento intensivo e individualizado.`,
    });
  }

  if (anterior) {
    const deltaIfl = ind.ifl - anterior.ifl;
    if (deltaIfl <= -5) {
      alertas.push({
        id: "ifl-queda",
        severidade: "critical",
        titulo: "Queda do IFL em relação à edição anterior",
        descricao: `O IFL caiu de ${anterior.ifl} para ${ind.ifl}. Revisar estratégias pedagógicas e cobertura da aplicação.`,
      });
    }

    const lfAtual = ind.distribuicao.find((d) => d.code === "LF")?.percentual ?? 0;
    const lfAnt = anterior.distribuicao.find((d) => d.code === "LF")?.percentual ?? 0;
    if (lfAtual - lfAnt >= 10) {
      alertas.push({
        id: "lf-avanco",
        severidade: "info",
        titulo: "Avanço em leitores fluentes",
        descricao: `A proporção de Leitores Fluentes subiu de ${lfAnt}% para ${lfAtual}%. Vale reforçar e disseminar as práticas que funcionaram.`,
      });
    }
  }

  if (ind.avaliados === 0 && ind.previstos > 0) {
    alertas.push({
      id: "sem-avaliados",
      severidade: "critical",
      titulo: "Nenhum estudante avaliado no escopo",
      descricao: "Há previstos, mas ainda não há resultados registrados para os filtros selecionados.",
    });
  }

  // Garante ids únicos e remove duplicatas por id
  const seen = new Set<string>();
  return alertas.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function descricaoPesosIfl(): string {
  return NIVEIS.map((n) => `${n.label}: peso ${n.pesoIfl}`).join(" · ");
}
