import { NIVEIS, type Indicadores, type RelatorioComputado, type ResultadoEstudante } from "./types";
import { pctNivel } from "./calc";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rowIndicadores(prefix: string[], ind: Indicadores): string {
  const nivelCols = NIVEIS.map((n) => pctNivel(ind, n.code));
  return [
    ...prefix,
    ind.previstos,
    ind.avaliados,
    ind.participacao,
    ...nivelCols,
    ind.ifl,
    ind.ppmMedio,
    ind.precisaoMedia,
  ]
    .map(escapeCsv)
    .join(";");
}

/** Exporta Excel-compatível (CSV com BOM ;). */
export function exportarRelatorioExcel(relatorio: RelatorioComputado) {
  const headerNiveis = NIVEIS.map((n) => `% ${n.short}`);
  const lines: string[] = [];

  lines.push("Relatório de resultados — Fluência");
  lines.push(`Título;${relatorio.tituloEdicao}`);
  lines.push(`Escopo;${relatorio.escopoLabel}`);
  lines.push(`Emitido em;${relatorio.emitidoEm.toLocaleString("pt-BR")}`);
  lines.push("");

  lines.push("Indicadores gerais");
  lines.push(
    ["Escopo", "Previstos", "Avaliados", "Participação %", ...headerNiveis, "IFL", "PPM médio", "Precisão média"].join(
      ";"
    )
  );
  lines.push(rowIndicadores(["Geral"], relatorio.indicadores));
  lines.push("");

  lines.push("Por escola");
  lines.push(
    ["Escola", "Previstos", "Avaliados", "Participação %", ...headerNiveis, "IFL", "PPM médio", "Precisão média"].join(
      ";"
    )
  );
  for (const e of relatorio.porEscola) {
    lines.push(rowIndicadores([e.escolaNome], e));
  }
  lines.push("");

  lines.push("Por turma");
  lines.push(
    [
      "Turma",
      "Escola",
      "Previstos",
      "Avaliados",
      "Participação %",
      ...headerNiveis,
      "IFL",
      "PPM médio",
      "Precisão média",
    ].join(";")
  );
  for (const t of relatorio.porTurma) {
    lines.push(rowIndicadores([t.turmaNome, t.escolaNome], t));
  }
  lines.push("");

  lines.push("Estudantes");
  lines.push(["Nome", "Matrícula", "Escola", "Turma", "Série", "Turno", "Avaliado", "Nível", "PPM", "Precisão"].join(";"));
  for (const r of relatorio.resultados) {
    lines.push(
      [
        r.nome,
        r.matricula,
        r.escolaNome,
        r.turmaNome,
        r.serieNome,
        r.turno,
        r.avaliado ? "Sim" : "Não",
        r.nivel ?? "",
        r.ppm ?? "",
        r.precisao ?? "",
      ]
        .map(escapeCsv)
        .join(";")
    );
  }

  const stamp = relatorio.emitidoEm.toISOString().slice(0, 10);
  downloadBlob(`relatorio-fluencia-${stamp}.csv`, lines.join("\n"), "text/csv;charset=utf-8;");
}

export function exportarRecorteEstudantes(estudantes: ResultadoEstudante[], titulo: string) {
  const lines = [
    titulo,
    ["Nome", "Matrícula", "Escola", "Turma", "Nível", "PPM", "Precisão"].join(";"),
    ...estudantes.map((r) =>
      [r.nome, r.matricula, r.escolaNome, r.turmaNome, r.nivel ?? "", r.ppm ?? "", r.precisao ?? ""]
        .map(escapeCsv)
        .join(";")
    ),
  ];
  downloadBlob(`relatorio-recorte-${Date.now()}.csv`, lines.join("\n"), "text/csv;charset=utf-8;");
}
