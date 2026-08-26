"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2, Presentation, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getStudent, type Student } from "@/lib/api/students";
import { getPerfilEstudanteResultados } from "@/lib/api/afirme-reading/resultados";
import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPerfilLeitorStyle, type PerfilLeitorCode } from "@/lib/colors/reading-levels";
import { exportarAlunoExcel, exportarAlunoPptx } from "@/lib/relatorios-fluencia/exportar-aluno";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import type { EdicaoCode, PerfilEstudanteRelatorio } from "@/lib/relatorios-fluencia/types";

export type StudentInfoSeed = {
  studentId?: string;
  name?: string;
  className?: string;
  schoolName?: string;
  classId?: string;
  schoolId?: string;
  perfilCode?: PerfilLeitorCode | null;
  ano?: number;
  edicao?: EdicaoCode;
  avaliacaoId?: string;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function mergeStudent(seed: StudentInfoSeed, fetched: Student | null): Student {
  return {
    id: fetched?.id ?? seed.studentId ?? "",
    name: fetched?.name || seed.name || "Estudante",
    classId: fetched?.classId ?? seed.classId ?? null,
    schoolId: fetched?.schoolId ?? seed.schoolId ?? null,
    registration: fetched?.registration ?? fetched?.registrationNumber ?? null,
    registrationNumber: fetched?.registrationNumber ?? fetched?.registration ?? null,
    email: fetched?.email ?? null,
    birthDate: fetched?.birthDate ?? null,
    gender: fetched?.gender ?? null,
    schoolName: fetched?.schoolName || seed.schoolName || null,
    className: fetched?.className || seed.className || null,
    gradeName: fetched?.gradeName ?? null,
  };
}

export function StudentInfoDialog({
  open,
  onOpenChange,
  seed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: StudentInfoSeed | null;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [perfil, setPerfil] = useState<PerfilEstudanteRelatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pptx" | null>(null);

  useEffect(() => {
    if (!open || !seed) {
      setStudent(null);
      setPerfil(null);
      return;
    }

    const current = seed;
    let cancelled = false;
    setStudent(mergeStudent(current, null));
    setPerfil(null);

    const id = current.studentId?.trim();
    if (!id) return;

    setLoading(true);
    void Promise.allSettled([
      getStudent(id),
      getPerfilEstudanteResultados(id, {
        ano: current.ano ?? new Date().getFullYear(),
        edicao: current.edicao,
        avaliacaoId: current.avaliacaoId,
      }),
    ])
      .then(([cadastro, resultados]) => {
        if (cancelled) return;
        if (cadastro.status === "fulfilled") {
          setStudent(mergeStudent(current, cadastro.value));
        }
        if (resultados.status === "fulfilled") {
          setPerfil(resultados.value);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    seed?.studentId,
    seed?.name,
    seed?.className,
    seed?.schoolName,
    seed?.classId,
    seed?.schoolId,
    seed?.ano,
    seed?.edicao,
    seed?.avaliacaoId,
  ]);

  const perfilAtual = perfil?.perfilAtual ?? seed?.perfilCode ?? null;
  const faixa = perfilAtual ? getPerfilLeitorStyle(perfilAtual) : null;

  const rows: { label: string; value: string }[] = [];
  if (student) {
    rows.push({ label: "Nome", value: student.name });
    if (student.registration || student.registrationNumber) {
      rows.push({ label: "Matrícula", value: student.registration || student.registrationNumber || "" });
    } else if (perfil?.matricula) {
      rows.push({ label: "Matrícula", value: perfil.matricula });
    }
    if (student.gradeName || perfil?.serieNome) {
      rows.push({ label: "Série", value: student.gradeName || perfil?.serieNome || "" });
    }
    if (student.className || perfil?.turmaNome) {
      rows.push({ label: "Turma", value: student.className || perfil?.turmaNome || "" });
    }
    if (student.schoolName || perfil?.escolaNome) {
      rows.push({ label: "Escola", value: student.schoolName || perfil?.escolaNome || "" });
    }
    if (student.email) rows.push({ label: "E-mail", value: student.email });
    const birth = formatDate(student.birthDate);
    if (birth) rows.push({ label: "Nascimento", value: birth });
    if (student.gender) {
      rows.push({
        label: "Sexo",
        value: student.gender === "F" ? "Feminino" : student.gender === "M" ? "Masculino" : student.gender,
      });
    }
  }

  const cadastroExport = {
    nome: student?.name ?? seed?.name ?? perfil?.nome ?? "Estudante",
    matricula: student?.registration || student?.registrationNumber || perfil?.matricula || null,
    escola: student?.schoolName || seed?.schoolName || perfil?.escolaNome || null,
    serie: student?.gradeName || perfil?.serieNome || null,
    turma: student?.className || seed?.className || perfil?.turmaNome || null,
    email: student?.email ?? null,
  };

  const handleExcel = async () => {
    if (!perfil) {
      toast.error("Histórico do estudante ainda não carregou.");
      return;
    }
    setExporting("xlsx");
    try {
      await exportarAlunoExcel(perfil, cadastroExport);
      toast.success("Planilha gerada.");
    } catch {
      toast.error("Não foi possível gerar o Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handlePptx = async () => {
    if (!perfil) {
      toast.error("Histórico do estudante ainda não carregou.");
      return;
    }
    setExporting("pptx");
    try {
      await exportarAlunoPptx(perfil, cadastroExport);
      toast.success("Apresentação gerada.");
    } catch {
      toast.error("Não foi possível gerar o PowerPoint.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {faixa ? (
          <div className="-mx-6 -mt-6 mb-2 h-1.5" style={{ backgroundColor: faixa.hex }} aria-hidden />
        ) : null}
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            Estudante
            <PerfilLeitorBadge code={perfilAtual} />
          </DialogTitle>
          <DialogDescription>
            {loading ? "Carregando dados do aluno…" : "Cadastro e histórico de avaliações."}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="break-words font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-2">
          <p className="text-sm font-medium">Histórico por edição</p>
          {!perfil ? (
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando histórico…" : "Ainda não há histórico para este aluno."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Edição</th>
                    <th className="px-3 py-2 font-medium">Nível</th>
                    <th className="px-3 py-2 text-right font-medium">PPM</th>
                    <th className="px-3 py-2 text-right font-medium">Precisão</th>
                    <th className="px-3 py-2 text-right font-medium">IFL</th>
                  </tr>
                </thead>
                <tbody>
                  {perfil.linhaDoTempo.map((l) => (
                    <tr key={l.edicao} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium">{l.edicaoLabel}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{perfil.ano}</span>
                      </td>
                      <td className="px-3 py-2">
                        <PerfilLeitorBadge code={l.nivel} />
                      </td>
                      <td className="px-3 py-2 text-right">{formatDecimal(l.resultado?.ppm)}</td>
                      <td className="px-3 py-2 text-right">{formatPct(l.resultado?.precisao)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatDecimal(l.resultado?.pesoIfl ?? (l.nivel === perfil.perfilAtual ? perfil.exportacao.iflDoNivel : null))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExcel()}
              disabled={exporting != null || !perfil}
            >
              {exporting === "xlsx" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Baixar Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handlePptx()}
              disabled={exporting != null || !perfil}
            >
              {exporting === "pptx" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Presentation className="mr-2 h-4 w-4" />
              )}
              Baixar PowerPoint
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StudentNameButton({
  name,
  onClick,
  className,
}: {
  name: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        "rounded-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      {name}
    </button>
  );
}
