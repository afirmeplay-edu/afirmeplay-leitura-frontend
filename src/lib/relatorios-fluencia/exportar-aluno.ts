import {
  getPerfilLeitorStyle,
  ICA_LEVELS,
  ICA_TO_PERFIL_LEITOR,
  PERFIL_LEITOR_LABEL,
  type PerfilLeitorCode,
} from "@/lib/colors/reading-levels";
import { EDICAO_LABEL, EDICOES_ORDEM, NIVEIS, PARAMETROS_LISTAS, type ResultadoEstudante } from "@/lib/relatorios-fluencia/types";
import { compreensaoPct, evolucaoNivel } from "@/lib/relatorios-fluencia/calc";
import {
  fraseAnaliticaEdicao,
  participacaoTurmaNaEdicao,
} from "@/lib/relatorios-fluencia/relatorios.mock";

export type AlunoExportCadastro = {
  nome: string;
  matricula?: string | null;
  escola?: string | null;
  serie?: string | null;
  turma?: string | null;
  email?: string | null;
};

function iflDoNivel(code: PerfilLeitorCode | null | undefined) {
  if (!code) return null;
  return NIVEIS.find((n) => n.code === code)?.pesoIfl ?? null;
}

function hexNoHash(hex: string) {
  return hex.replace("#", "");
}

function pickUltimaEdicao(historico: ResultadoEstudante[]) {
  const ranked = [...historico].sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;
    const ordem: Record<string, number> = { saida: 3, formativa: 2, entrada: 1 };
    return (ordem[b.edicao] ?? 0) - (ordem[a.edicao] ?? 0);
  });
  return ranked.find((r) => r.avaliado && r.nivel) ?? ranked[0];
}

export async function exportarAlunoExcel(cadastro: AlunoExportCadastro, historico: ResultadoEstudante[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
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

  const histRows = historico.map((r) => ({
    Ano: r.ano,
    Edição: EDICAO_LABEL[r.edicao],
    Avaliado: r.avaliado ? "Sim" : "Não",
    Nível: r.nivel ? PERFIL_LEITOR_LABEL[r.nivel] : "",
    PPM: r.ppm ?? "",
    Precisão: r.precisao ?? "",
    IFL: iflDoNivel(r.nivel) ?? "",
    "Participação da turma %": participacaoTurmaNaEdicao(r),
    Observação: fraseAnaliticaEdicao(r),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), "Avaliações");

  const safe = cadastro.nome.replace(/[^\wÀ-ÿ]+/g, "-").slice(0, 40);
  XLSX.writeFile(wb, `aluno-${safe}.xlsx`);
}

export async function exportarAlunoPptx(cadastro: AlunoExportCadastro, historico: ResultadoEstudante[]) {
  const mod = await import("pptxgenjs");
  const PptxGenJS = mod.default;
  const pptx = new PptxGenJS();
  pptx.author = "Afirme Ler";
  pptx.title = `Relatório de fluência — ${cadastro.nome}`;

  const ultima = pickUltimaEdicao(historico);
  const nivelCapa = ultima?.nivel ?? "PL1";
  const corCapa = getPerfilLeitorStyle(nivelCapa);

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

  const ultimaLabel = ultima ? `${EDICAO_LABEL[ultima.edicao]} ${ultima.ano}` : "—";
  capa.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: 2.25,
    w: 3.2,
    h: 0.45,
    fill: { color: hexNoHash(corCapa.hex) },
  });
  capa.addText(ultima?.nivel ? PERFIL_LEITOR_LABEL[ultima.nivel] : "Sem nível", {
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
      `IFL: ${iflDoNivel(ultima?.nivel) ?? "—"}`,
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

  for (const r of historico) {
    const style = getPerfilLeitorStyle(r.nivel ?? "PL1");
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.55,
      fill: { color: hexNoHash(style.hex) },
    });
    slide.addText(`${EDICAO_LABEL[r.edicao]} · ${r.ano}`, {
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
    slide.addText(r.nivel ? PERFIL_LEITOR_LABEL[r.nivel] : "Não avaliado", {
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
        `IFL: ${iflDoNivel(r.nivel) ?? "—"}`,
        `Participação da turma: ${participacaoTurmaNaEdicao(r)}%`,
      ].join("\n"),
      { x: 0.4, y: 2.05, w: 9.2, h: 1.8, fontSize: 18, color: "0F172A" }
    );
    slide.addText(fraseAnaliticaEdicao(r), {
      x: 0.4,
      y: 4.1,
      w: 9.2,
      h: 1.2,
      fontSize: 16,
      color: "334155",
    });
  }

  const safe = cadastro.nome.replace(/[^\wÀ-ÿ]+/g, "-").slice(0, 40);
  await pptx.writeFile({ fileName: `aluno-${safe}.pptx` });
}

function r1(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "";
  return Math.round(n * 10) / 10;
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

function situacao(r: ResultadoEstudante) {
  return r.status ?? (r.avaliado ? "presente" : "não avaliado");
}

function labelEvolucao(de: ResultadoEstudante["nivel"], para: ResultadoEstudante["nivel"]) {
  const ev = evolucaoNivel(de, para);
  if (ev === "avanco") return "▲ avanço";
  if (ev === "regressao") return "▼ regressão";
  if (ev === "manutencao") return "→ manutenção";
  return "—";
}

function historicoDoAno(estudante: ResultadoEstudante, historico: ResultadoEstudante[]) {
  return EDICOES_ORDEM.map((ed) => {
    const reg = historico.find(
      (h) => h.edicao === ed && h.ano === estudante.ano && (h.matricula === estudante.matricula || h.nome === estudante.nome)
    );
    return { edicao: ed, reg: reg ?? null };
  });
}

/** Relatório individual no formato do MVP: ficha + linha do tempo. */
export async function exportarEstudanteExcel(estudante: ResultadoEstudante, historico: ResultadoEstudante[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const presente = situacao(estudante) === "presente";
  const ficha: Record<string, string | number>[] = [
    { Indicador: "Matrícula", Valor: estudante.matricula },
    { Indicador: "Estudante", Valor: estudante.nome },
    { Indicador: "Escola", Valor: estudante.escolaNome },
    { Indicador: "Município / Rede", Valor: `${estudante.municipioNome} (${estudante.redeNome})` },
    {
      Indicador: "Série / Turma / Turno",
      Valor: `${estudante.serieNome} · ${estudante.turmaNome} · ${estudante.turno}`,
    },
    { Indicador: "Edição", Valor: `${EDICAO_LABEL[estudante.edicao]} ${estudante.ano}` },
    { Indicador: "Situação", Valor: situacao(estudante) },
    { Indicador: "Palavras corretas", Valor: presente ? `${estudante.palavrasCorretas}/${PARAMETROS_LISTAS.totalPalavras}` : "" },
    {
      Indicador: "Pseudopalavras corretas",
      Valor: presente ? `${estudante.desconhecidasCorretas}/${PARAMETROS_LISTAS.totalDesconhecidas}` : "",
    },
    { Indicador: "Palavras do texto lidas", Valor: presente ? estudante.textoPalavrasLidas : "" },
    { Indicador: "Erros no texto", Valor: presente ? estudante.textoErros : "" },
    { Indicador: "PPM", Valor: presente ? r1(estudante.ppm) : "" },
    { Indicador: "Precisão (%)", Valor: presente ? r1(estudante.precisao) : "" },
    {
      Indicador: "Prosódia",
      Valor: presente ? (estudante.prosodiaAdequada ? "Adequada" : "Inadequada") : "",
    },
    {
      Indicador: "Compreensão",
      Valor: presente
        ? `${estudante.compreensaoAcertos}/${estudante.compreensaoValidas} (${r1(compreensaoPct(estudante))}%)`
        : "",
    },
    {
      Indicador: "Silabações / Soletrações",
      Valor: presente ? `${estudante.silabacoes} / ${estudante.soletracoes}` : "",
    },
    {
      Indicador: "Perfil leitor",
      Valor: estudante.nivel ? `${PERFIL_LEITOR_LABEL[estudante.nivel]} (${estudante.nivel})` : "Sem perfil",
    },
  ];

  const linha = historicoDoAno(estudante, historico).map(({ edicao, reg }) => {
    const ok = reg && situacao(reg) === "presente";
    return {
      Edição: EDICAO_LABEL[edicao],
      Situação: reg ? situacao(reg) : "sem registro",
      Perfil: reg?.nivel ? `${PERFIL_LEITOR_LABEL[reg.nivel]} (${reg.nivel})` : "Sem perfil",
      PPM: ok ? r1(reg.ppm) : "",
      "Precisão (%)": ok ? r1(reg.precisao) : "",
      "Compreensão (%)": ok ? r1(compreensaoPct(reg)) : "",
      Prosódia: ok ? (reg.prosodiaAdequada ? "Adequada" : "Inadequada") : "",
      "Palavras corretas": ok ? reg.palavrasCorretas : "",
      "P. desconhecidas": ok ? reg.desconhecidasCorretas : "",
    };
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ficha), "Ficha");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linha), "Linha do tempo");
  XLSX.writeFile(wb, `${nomeArquivo("ficha", estudante.nome, estudante.matricula)}.xlsx`);
}

export async function exportarEstudantePptx(estudante: ResultadoEstudante, historico: ResultadoEstudante[]) {
  const mod = await import("pptxgenjs");
  const PptxGenJS = mod.default;
  const pptx = new PptxGenJS();
  pptx.author = "Afirme Ler";
  pptx.title = `Relatório de fluência — ${estudante.nome}`;

  const presente = situacao(estudante) === "presente";
  const corCapa = getPerfilLeitorStyle(estudante.nivel ?? "PL1");

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
  capa.addText(estudante.nome, {
    x: 0.4,
    y: 1.05,
    w: 9.2,
    h: 0.5,
    fontSize: 26,
    bold: true,
    color: "0F172A",
  });
  capa.addText(`Matrícula ${estudante.matricula}`, {
    x: 0.4,
    y: 1.55,
    w: 9.2,
    h: 0.3,
    fontSize: 14,
    color: "334155",
  });
  capa.addText(
    [
      estudante.escolaNome,
      `${estudante.serieNome} · ${estudante.turmaNome} · ${estudante.turno}`,
      `${estudante.municipioNome} (${estudante.redeNome})`,
      `${EDICAO_LABEL[estudante.edicao]} ${estudante.ano}`,
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
  capa.addText(estudante.nivel ? PERFIL_LEITOR_LABEL[estudante.nivel] : "Sem perfil", {
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
    presente
      ? [
          `PPM: ${estudante.ppm ?? "—"}`,
          `Precisão: ${estudante.precisao != null ? `${estudante.precisao}%` : "—"}`,
          `Prosódia: ${estudante.prosodiaAdequada ? "Adequada" : "Inadequada"}`,
          `Compreensão: ${estudante.compreensaoAcertos}/${estudante.compreensaoValidas} (${compreensaoPct(estudante) ?? "—"}%)`,
        ].join("\n")
      : `Situação: ${situacao(estudante)}. Dados insuficientes nesta edição.`,
    { x: 0.4, y: 3.95, w: 9.2, h: 1.5, fontSize: 16, color: "0F172A" }
  );

  const linha = historicoDoAno(estudante, historico);
  for (const { edicao, reg } of linha) {
    if (!reg || situacao(reg) !== "presente") continue;
    const style = getPerfilLeitorStyle(reg.nivel ?? "PL1");
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.55,
      fill: { color: hexNoHash(style.hex) },
    });
    slide.addText(`${EDICAO_LABEL[edicao]} · ${reg.ano}`, {
      x: 0.4,
      y: 0.08,
      w: 9.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: hexNoHash(style.fgHex),
    });
    slide.addText(estudante.nome, {
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
    slide.addText(reg.nivel ? PERFIL_LEITOR_LABEL[reg.nivel] : "Sem perfil", {
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
        `Prosódia: ${reg.prosodiaAdequada ? "Adequada" : "Inadequada"}`,
        `Compreensão: ${reg.compreensaoAcertos}/${reg.compreensaoValidas} (${compreensaoPct(reg) ?? "—"}%)`,
        `Palavras corretas: ${reg.palavrasCorretas}/${PARAMETROS_LISTAS.totalPalavras}`,
        `P. desconhecidas: ${reg.desconhecidasCorretas}/${PARAMETROS_LISTAS.totalDesconhecidas}`,
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
  evo.addText(estudante.nome, {
    x: 0.4,
    y: 0.8,
    w: 9.2,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: "0F172A",
  });

  const trechos: string[] = [];
  for (let i = 1; i < linha.length; i++) {
    const de = linha[i - 1]?.reg?.nivel ?? null;
    const para = linha[i]?.reg?.nivel ?? null;
    trechos.push(
      `${EDICAO_LABEL[linha[i - 1].edicao]} → ${EDICAO_LABEL[linha[i].edicao]}: ${labelEvolucao(de, para)}`
    );
  }
  evo.addText(trechos.join("\n") || "Sem edições suficientes para comparar.", {
    x: 0.4,
    y: 1.4,
    w: 9.2,
    h: 2.4,
    fontSize: 18,
    color: "0F172A",
  });

  await pptx.writeFile({ fileName: `${nomeArquivo("estudante", estudante.nome, estudante.matricula)}.pptx` });
}
