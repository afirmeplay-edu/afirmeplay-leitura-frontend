"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Presentation, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getStudent, type Student } from "@/lib/api/students";
import { getMockClassById } from "@/lib/mock/classes";
import { getMockSchoolById } from "@/lib/mock/schools";
import { getMockStudentById } from "@/lib/mock/students";
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
import {
  exportarAlunoExcel,
  exportarAlunoPptx,
} from "@/lib/relatorios-fluencia/exportar-aluno";
import { getHistoricoEstudanteMock } from "@/lib/relatorios-fluencia/relatorios.mock";
import { EDICAO_LABEL, NIVEIS } from "@/lib/relatorios-fluencia/types";

export type StudentInfoSeed = {
  studentId?: string;
  name?: string;
  className?: string;
  schoolName?: string;
  classId?: string;
  schoolId?: string;
  perfilCode?: PerfilLeitorCode | null;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function iflDoNivel(code: PerfilLeitorCode | null | undefined) {
  if (!code) return null;
  return NIVEIS.find((n) => n.code === code)?.pesoIfl ?? null;
}

function mergeStudent(seed: StudentInfoSeed, fetched: Student | null): Student {
  const mock = seed.studentId ? getMockStudentById(seed.studentId) : undefined;
  const mockClass = mock ? getMockClassById(mock.classId) : undefined;
  const mockSchool = mock ? getMockSchoolById(mock.schoolId) : undefined;

  return {
    id: fetched?.id ?? seed.studentId ?? "",
    name: fetched?.name || seed.name || mock?.name || "Estudante",
    classId: fetched?.classId ?? seed.classId ?? mock?.classId ?? null,
    schoolId: fetched?.schoolId ?? seed.schoolId ?? mock?.schoolId ?? null,
    registration: fetched?.registration ?? fetched?.registrationNumber ?? null,
    registrationNumber: fetched?.registrationNumber ?? fetched?.registration ?? null,
    email: fetched?.email ?? mock?.email ?? null,
    birthDate: fetched?.birthDate ?? mock?.birthDate ?? null,
    gender: fetched?.gender ?? mock?.gender ?? null,
    schoolName: fetched?.schoolName || seed.schoolName || mockSchool?.name || null,
    className: fetched?.className || seed.className || mockClass?.name || null,
    gradeName: fetched?.gradeName || (mockClass ? `${mockClass.grade}º Ano` : null),
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
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pptx" | null>(null);

  useEffect(() => {
    if (!open || !seed) {
      setStudent(null);
      return;
    }

    const current = seed;
    let cancelled = false;
    setStudent(mergeStudent(current, null));

    const id = current.studentId?.trim();
    if (!id) return;

    setLoading(true);
    void getStudent(id)
      .then((fetched) => {
        if (cancelled) return;
        setStudent(mergeStudent(current, fetched));
      })
      .catch(() => {
        /* cadastro mock / seed já preenchido */
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
  ]);

  const historico = useMemo(() => {
    if (!open || !seed) return [];
    return getHistoricoEstudanteMock({
      studentId: seed.studentId,
      nome: seed.name || student?.name,
    });
  }, [open, seed, student?.name]);

  const ultima = useMemo(() => {
    const ranked = [...historico].sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      const ordem: Record<string, number> = { saida: 3, formativa: 2, entrada: 1 };
      return (ordem[b.edicao] ?? 0) - (ordem[a.edicao] ?? 0);
    });
    return ranked.find((r) => r.avaliado && r.nivel) ?? ranked[0] ?? null;
  }, [historico]);

  const perfilAtual = ultima?.nivel ?? seed?.perfilCode ?? null;
  const faixa = perfilAtual ? getPerfilLeitorStyle(perfilAtual) : null;

  const rows: { label: string; value: string }[] = [];
  if (student) {
    rows.push({ label: "Nome", value: student.name });
    if (student.registration || student.registrationNumber) {
      rows.push({ label: "Matrícula", value: student.registration || student.registrationNumber || "" });
    }
    if (student.gradeName) rows.push({ label: "Série", value: student.gradeName });
    if (student.className) rows.push({ label: "Turma", value: student.className });
    if (student.schoolName) rows.push({ label: "Escola", value: student.schoolName });
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
    nome: student?.name ?? seed?.name ?? "Estudante",
    matricula: student?.registration || student?.registrationNumber || ultima?.matricula || null,
    escola: student?.schoolName || seed?.schoolName || ultima?.escolaNome || null,
    serie: student?.gradeName || ultima?.serieNome || null,
    turma: student?.className || seed?.className || ultima?.turmaNome || null,
    email: student?.email ?? null,
  };

  const handleExcel = async () => {
    setExporting("xlsx");
    try {
      await exportarAlunoExcel(cadastroExport, historico);
      toast.success("Planilha gerada.");
    } catch {
      toast.error("Não foi possível gerar o Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handlePptx = async () => {
    setExporting("pptx");
    try {
      await exportarAlunoPptx(cadastroExport, historico);
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
            {loading ? "Carregando dados do aluno…" : "Cadastro e histórico de avaliações (mock por edição)."}
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
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há histórico mock para este aluno. A estrutura está pronta para a API de sessões.
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
                  {historico.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium">{EDICAO_LABEL[r.edicao]}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{r.ano}</span>
                      </td>
                      <td className="px-3 py-2">
                        <PerfilLeitorBadge code={r.nivel} />
                      </td>
                      <td className="px-3 py-2 text-right">{r.ppm ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {r.precisao != null ? `${r.precisao}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{iflDoNivel(r.nivel) ?? "—"}</td>
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
              disabled={exporting != null}
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
              disabled={exporting != null}
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
