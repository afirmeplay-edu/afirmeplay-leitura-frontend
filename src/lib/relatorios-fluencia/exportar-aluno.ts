import {
  getPerfilLeitorStyle,
  ICA_LEVELS,
  ICA_TO_PERFIL_LEITOR,
  PERFIL_LEITOR_LABEL,
} from "@/lib/colors/reading-levels";
import { labelEvolucao } from "@/lib/relatorios-fluencia/format";
import type {
  EdicaoCode,
  PerfilEstudanteRelatorio,
  ResultadoEstudante,
} from "@/lib/relatorios-fluencia/types";

export type AlunoExportCadastro = {
  nome: string;
  matricula?: string | null;
  escola?: string | null;
  serie?: string | null;
  turma?: string | null;
  email?: string | null;
};

function hexNoHash(hex: string) {
  return hex.replace("#", "");
}

function cadastroFromPerfil(perfil: PerfilEstudanteRelatorio, extra?: AlunoExportCadastro): AlunoExportCadastro {
  return {
    nome: extra?.nome || perfil.nome,
    matricula: extra?.matricula || perfil.matricula,
    escola: extra?.escola || perfil.escolaNome,
    serie: extra?.serie || perfil.serieNome,
    turma: extra?.turma || perfil.turmaNome,
    email: extra?.email ?? null,
  };
}

function resultadoAtivo(perfil: PerfilEstudanteRelatorio, edicao?: EdicaoCode): ResultadoEstudante | null {
  if (edicao) {
    const found = perfil.linhaDoTempo.find((l) => l.edicao === edicao)?.resultado;
    if (found) return found;
  }
  return (
    perfil.linhaDoTempo.find((l) => l.nivel === perfil.perfilAtual && l.resultado)?.resultado ??
    perfil.linhaDoTempo.find((l) => l.resultado)?.resultado ??
    null
  );
}

function nomeArquivo(...partes: string[]) {
  return partes
    .filter(Boolean)
    .map((s) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
    )
    .join("-");
}

function exportacaoDaLinha(perfil: PerfilEstudanteRelatorio, resultado: ResultadoEstudante | null) {
  if (!resultado) return { ifl: "", participacao: "", frase: "" };
  const atual = resultado.nivel === perfil.perfilAtual;
  return {
    ifl: resultado.pesoIfl ?? (atual ? perfil.exportacao.iflDoNivel : null) ?? "",
    participacao: atual ? (perfil.exportacao.participacaoTurmaPct ?? "") : "",
    frase: atual ? perfil.exportacao.fraseAnalitica : "",
  };
}

export async function exportarAlunoExcel(perfil: PerfilEstudanteRelatorio, extra?: AlunoExportCadastro) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const cadastro = cadastroFromPerfil(perfil, extra);
  const cadastroRows = [
    ["Campo", "Valor"],
    ["Nome", cadastro.nome],
    ["Matrícula", cadastro.matricula ?? ""],
    ["Escola", cadastro.escola ?? ""],
    ["Série", cadastro.serie ?? ""],
    ["Turma", cadastro.turma ?? ""],
    ["E-mail", cadastro.email ?? ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cadastroRows), "Cadastro");

  const histRows = perfil.linhaDoTempo.map((l) => {
    const r = l.resultado;
    const extraCols = exportacaoDaLinha(perfil, r);
    return {
      Ano: perfil.ano,
      Edição: l.edicaoLabel,
      Avaliado: r?.avaliado ? "Sim" : "Não",
      Nível: l.nivelLabel || "",
      PPM: r?.ppm ?? "",
      Precisão: r?.precisao ?? "",
      IFL: extraCols.ifl,
      "Participação da turma %": extraCols.participacao,
      Observação: extraCols.frase,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), "Avaliações");

  const safe = cadastro.nome.replace(/[^\wÀ-ÿ]+/g, "-").slice(0, 40);
  XLSX.writeFile(wb, `aluno-${safe}.xlsx`);
}

export async function exportarAlunoPptx(perfil: PerfilEstudanteRelatorio, extra?: AlunoExportCadastro) {
  const mod = await import("pptxgenjs");
  const PptxGenJS = mod.default;
  const pptx = new PptxGenJS();
  const cadastro = cadastroFromPerfil(perfil, extra);
  pptx.author = "Afirme Ler";
  pptx.title = `Relatório de fluência — ${cadastro.nome}`;

  const ultima = resultadoAtivo(perfil);
  const nivelCapa = perfil.perfilAtual ?? ultima?.nivel ?? "PL1";
  const corCapa = getPerfilLeitorStyle(nivelCapa);
  const ultimaLinha =
    (ultima ? perfil.linhaDoTempo.find((l) => l.edicao === ultima.edicao) : null) ??
    perfil.linhaDoTempo.at(-1);

  const capa = pptx.addSlide();
  capa.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.55,
    fill: { color: hexNoHash(corCapa.hex) },
  });
  capa.addText("Afirme Ler — Relatório de fluência", {
    x: 0.4,
    y: 0.7,
    w: 9.2,
    h: 0.35,
    fontSize: 12,
    color: "64748B",
  });
  capa.addText(cadastro.nome, {
    x: 0.4,
    y: 1.1,
    w: 9.2,
    h: 0.55,
    fontSize: 28,
    bold: true,
    color: "0F172A",
  });
  capa.addText(
    [cadastro.escola, cadastro.serie, cadastro.turma].filter(Boolean).join(" · ") || "Escopo não informado",
    { x: 0.4, y: 1.7, w: 9.2, h: 0.35, fontSize: 14, color: "334155" }
  );

  const ultimaLabel = ultimaLinha ? `${ultimaLinha.edicaoLabel} ${perfil.ano}` : "—";
  capa.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: 2.25,
    w: 3.2,
    h: 0.45,
    fill: { color: hexNoHash(corCapa.hex) },
  });
  capa.addText(ultimaLinha?.nivelLabel || "Sem nível", {
    x: 0.4,
    y: 2.28,
    w: 3.2,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: hexNoHash(corCapa.fgHex),
    align: "center",
  });

  capa.addText(
    [
      `Última edição: ${ultimaLabel}`,
      `IFL: ${perfil.exportacao.iflDoNivel ?? ultima?.pesoIfl ?? "—"}`,
      `PPM: ${ultima?.ppm ?? "—"}`,
      `Precisão: ${ultima?.precisao != null ? `${ultima.precisao}%` : "—"}`,
    ].join("\n"),
    { x: 0.4, y: 2.9, w: 5.5, h: 1.6, fontSize: 16, color: "0F172A" }
  );

  capa.addText("Legenda de perfil leitor", {
    x: 0.4,
    y: 4.6,
    w: 9.2,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: "334155",
  });
  ICA_LEVELS.forEach((level, i) => {
    const x = 0.4 + (i % 6) * 1.55;
    capa.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 5.0,
      w: 1.45,
      h: 0.38,
      fill: { color: hexNoHash(level.hex) },
    });
    capa.addText(PERFIL_LEITOR_LABEL[ICA_TO_PERFIL_LEITOR[level.level]], {
      x,
      y: 5.02,
      w: 1.45,
      h: 0.34,
      fontSize: 9,
      bold: true,
      color: hexNoHash(level.fgHex),
      align: "center",
    });
  });

  for (const linha of perfil.linhaDoTempo) {
    const r = linha.resultado;
    if (!r) continue;
    const extraCols = exportacaoDaLinha(perfil, r);
    const style = getPerfilLeitorStyle(r.nivel ?? "PL1");
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.55,
      fill: { color: hexNoHash(style.hex) },
    });
    slide.addText(`${linha.edicaoLabel} · ${perfil.ano}`, {
      x: 0.4,
      y: 0.08,
      w: 9.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: hexNoHash(style.fgHex),
    });
    slide.addText(cadastro.nome, {
      x: 0.4,
      y: 0.8,
      w: 9.2,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: "0F172A",
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.4,
      y: 1.35,
      w: 3.4,
      h: 0.45,
      fill: { color: hexNoHash(style.hex) },
    });
    slide.addText(linha.nivelLabel || "Não avaliado", {
      x: 0.4,
      y: 1.38,
      w: 3.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: hexNoHash(style.fgHex),
      align: "center",
    });
    slide.addText(
      [
        `PPM: ${r.ppm ?? "—"}`,
        `Precisão: ${r.precisao != null ? `${r.precisao}%` : "—"}`,
        `IFL: ${extraCols.ifl || "—"}`,
        extraCols.participacao !== "" ? `Participação da turma: ${extraCols.participacao}%` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      { x: 0.4, y: 2.05, w: 9.2, h: 1.8, fontSize: 18, color: "0F172A" }
    );
    if (extraCols.frase) {
      slide.addText(extraCols.frase, {
        x: 0.4,
        y: 4.1,
        w: 9.2,
        h: 1.2,
        fontSize: 16,
        color: "334155",
      });
    }
  }

  const safe = cadastro.nome.replace(/[^\wÀ-ÿ]+/g, "-").slice(0, 40);
  await pptx.writeFile({ fileName: `aluno-${safe}.pptx` });
}

export async function exportarEstudanteExcel(perfil: PerfilEstudanteRelatorio, edicao?: EdicaoCode) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const estudante = resultadoAtivo(perfil, edicao);
  const linhaAtiva = perfil.linhaDoTempo.find((l) => l.edicao === (edicao ?? estudante?.edicao));
  const presente = estudante?.status === "presente";
  const ficha: Record<string, string | number>[] = [
    { Indicador: "Matrícula", Valor: perfil.matricula },
    { Indicador: "Estudante", Valor: perfil.nome },
    { Indicador: "Escola", Valor: perfil.escolaNome },
    { Indicador: "Município / Rede", Valor: `${perfil.municipioNome} (${perfil.redeNome})` },
    {
      Indicador: "Série / Turma / Turno",
      Valor: `${perfil.serieNome} · ${perfil.turmaNome} · ${perfil.turno}`,
    },
    { Indicador: "Edição", Valor: `${linhaAtiva?.edicaoLabel ?? ""} ${perfil.ano}`.trim() },
    { Indicador: "Situação", Valor: estudante?.status ?? "sem registro" },
    {
      Indicador: "Palavras corretas",
      Valor: presente && estudante ? `${estudante.palavrasCorretas}/${estudante.totalPalavras}` : "",
    },
    {
      Indicador: "Pseudopalavras corretas",
      Valor: presente && estudante ? `${estudante.desconhecidasCorretas}/${estudante.totalDesconhecidas}` : "",
    },
    { Indicador: "Palavras do texto lidas", Valor: presente && estudante ? estudante.textoPalavrasLidas : "" },
    { Indicador: "Erros no texto", Valor: presente && estudante ? estudante.textoErros : "" },
    { Indicador: "PPM", Valor: presente && estudante ? (estudante.ppm ?? "") : "" },
    { Indicador: "Precisão (%)", Valor: presente && estudante ? (estudante.precisao ?? "") : "" },
    { Indicador: "Prosódia", Valor: presente && estudante ? estudante.prosodiaLabel : "" },
    {
      Indicador: "Compreensão",
      Valor:
        presente && estudante
          ? `${estudante.compreensaoAcertos}/${estudante.compreensaoValidas} (${estudante.compreensaoPct ?? "—"}%)`
          : "",
    },
    {
      Indicador: "Silabações / Soletrações",
      Valor: presente && estudante ? `${estudante.silabacoes} / ${estudante.soletracoes}` : "",
    },
    { Indicador: "Perfil leitor", Valor: linhaAtiva?.nivelLabel || estudante?.nivelLabel || "Sem perfil" },
    { Indicador: "IFL do nível", Valor: perfil.exportacao.iflDoNivel ?? estudante?.pesoIfl ?? "" },
    { Indicador: "Participação da turma %", Valor: perfil.exportacao.participacaoTurmaPct ?? "" },
    { Indicador: "Observação", Valor: perfil.exportacao.fraseAnalitica ?? "" },
  ];

  const linha = perfil.linhaDoTempo.map((l) => {
    const reg = l.resultado;
    const ok = reg?.status === "presente";
    return {
      Edição: l.edicaoLabel,
      Situação: reg?.status ?? "sem registro",
      Perfil: l.nivelLabel || "Sem perfil",
      PPM: ok ? (reg.ppm ?? "") : "",
      "Precisão (%)": ok ? (reg.precisao ?? "") : "",
      "Compreensão (%)": ok ? (reg.compreensaoPct ?? "") : "",
      Prosódia: ok ? reg.prosodiaLabel : "",
      "Palavras corretas": ok ? reg.palavrasCorretas : "",
      "P. desconhecidas": ok ? reg.desconhecidasCorretas : "",
    };
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ficha), "Ficha");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linha), "Linha do tempo");
  XLSX.writeFile(wb, `${nomeArquivo("ficha", perfil.nome, perfil.matricula)}.xlsx`);
}

export async function exportarEstudantePptx(perfil: PerfilEstudanteRelatorio, edicao?: EdicaoCode) {
  const mod = await import("pptxgenjs");
  const PptxGenJS = mod.default;
  const pptx = new PptxGenJS();
  pptx.author = "Afirme Ler";
  pptx.title = `Relatório de fluência — ${perfil.nome}`;

  const estudante = resultadoAtivo(perfil, edicao);
  const linhaAtiva = perfil.linhaDoTempo.find((l) => l.edicao === (edicao ?? estudante?.edicao));
  const presente = estudante?.status === "presente";
  const corCapa = getPerfilLeitorStyle(estudante?.nivel ?? perfil.perfilAtual ?? "PL1");

  const capa = pptx.addSlide();
  capa.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.55,
    fill: { color: hexNoHash(corCapa.hex) },
  });
  capa.addText("Afirme Ler — Relatório do estudante", {
    x: 0.4,
    y: 0.7,
    w: 9.2,
    h: 0.3,
    fontSize: 12,
    color: "64748B",
  });
  capa.addText(perfil.nome, {
    x: 0.4,
    y: 1.05,
    w: 9.2,
    h: 0.5,
    fontSize: 26,
    bold: true,
    color: "0F172A",
  });
  capa.addText(`Matrícula ${perfil.matricula}`, {
    x: 0.4,
    y: 1.55,
    w: 9.2,
    h: 0.3,
    fontSize: 14,
    color: "334155",
  });
  capa.addText(
    [
      perfil.escolaNome,
      `${perfil.serieNome} · ${perfil.turmaNome} · ${perfil.turno}`,
      `${perfil.municipioNome} (${perfil.redeNome})`,
      `${linhaAtiva?.edicaoLabel ?? ""} ${perfil.ano}`.trim(),
    ].join("\n"),
    { x: 0.4, y: 1.95, w: 9.2, h: 1.2, fontSize: 14, color: "334155" }
  );

  capa.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: 3.3,
    w: 3.4,
    h: 0.45,
    fill: { color: hexNoHash(corCapa.hex) },
  });
  capa.addText(linhaAtiva?.nivelLabel || estudante?.nivelLabel || "Sem perfil", {
    x: 0.4,
    y: 3.33,
    w: 3.4,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: hexNoHash(corCapa.fgHex),
    align: "center",
  });

  capa.addText(
    presente && estudante
      ? [
          `PPM: ${estudante.ppm ?? "—"}`,
          `Precisão: ${estudante.precisao != null ? `${estudante.precisao}%` : "—"}`,
          `Prosódia: ${estudante.prosodiaLabel || "—"}`,
          `Compreensão: ${estudante.compreensaoAcertos}/${estudante.compreensaoValidas} (${estudante.compreensaoPct ?? "—"}%)`,
        ].join("\n")
      : `Situação: ${estudante?.status ?? "sem registro"}. Sem indicadores nesta edição.`,
    { x: 0.4, y: 3.95, w: 9.2, h: 1.5, fontSize: 16, color: "0F172A" }
  );

  for (const linha of perfil.linhaDoTempo) {
    const reg = linha.resultado;
    if (!reg || reg.status !== "presente") continue;
    const style = getPerfilLeitorStyle(reg.nivel ?? "PL1");
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.55,
      fill: { color: hexNoHash(style.hex) },
    });
    slide.addText(`${linha.edicaoLabel} · ${perfil.ano}`, {
      x: 0.4,
      y: 0.08,
      w: 9.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: hexNoHash(style.fgHex),
    });
    slide.addText(perfil.nome, {
      x: 0.4,
      y: 0.8,
      w: 9.2,
      h: 0.35,
      fontSize: 18,
      bold: true,
      color: "0F172A",
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.4,
      y: 1.3,
      w: 3.4,
      h: 0.45,
      fill: { color: hexNoHash(style.hex) },
    });
    slide.addText(linha.nivelLabel || "Sem perfil", {
      x: 0.4,
      y: 1.33,
      w: 3.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: hexNoHash(style.fgHex),
      align: "center",
    });
    slide.addText(
      [
        `PPM: ${reg.ppm ?? "—"}`,
        `Precisão: ${reg.precisao != null ? `${reg.precisao}%` : "—"}`,
        `Prosódia: ${reg.prosodiaLabel || "—"}`,
        `Compreensão: ${reg.compreensaoAcertos}/${reg.compreensaoValidas} (${reg.compreensaoPct ?? "—"}%)`,
        `Palavras corretas: ${reg.palavrasCorretas}/${reg.totalPalavras}`,
        `P. desconhecidas: ${reg.desconhecidasCorretas}/${reg.totalDesconhecidas}`,
      ].join("\n"),
      { x: 0.4, y: 2.0, w: 9.2, h: 2.6, fontSize: 18, color: "0F172A" }
    );
  }

  const evo = pptx.addSlide();
  evo.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.55,
    fill: { color: "334155" },
  });
  evo.addText("Evolução do perfil", {
    x: 0.4,
    y: 0.08,
    w: 9.2,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: "FFFFFF",
  });
  evo.addText(perfil.nome, {
    x: 0.4,
    y: 0.8,
    w: 9.2,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: "0F172A",
  });

  const trechos = perfil.linhaDoTempo.map((l) => {
    const ev = l.resultado?.evolucao ?? (l.edicao === (edicao ?? estudante?.edicao) ? perfil.evolucao : null);
    return `${l.edicaoLabel}: ${l.nivelLabel || "Sem perfil"} · ${labelEvolucao(ev)}`;
  });
  evo.addText(trechos.join("\n") || "Sem edições suficientes para comparar.", {
    x: 0.4,
    y: 1.4,
    w: 9.2,
    h: 2.4,
    fontSize: 18,
    color: "0F172A",
  });

  await pptx.writeFile({ fileName: `${nomeArquivo("estudante", perfil.nome, perfil.matricula)}.pptx` });
}
