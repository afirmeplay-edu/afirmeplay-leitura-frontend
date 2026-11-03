"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import {
  getIcaDashboard,
  postIcaProficiency,
  type IcaDashboardRow,
  type IcaProficiencyStudentInput,
} from "@/lib/api/afirme-reading/ica-results";
import { listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { ICA_BRAND } from "@/lib/ica/brand";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "all";

export function IcaProficiencyImportPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para importar a proficiência do ICA.">
      <IcaProficiencyImportContent />
    </IcaCityScope>
  );
}

function IcaProficiencyImportContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("writtenTestId") ?? "";
  const [tests, setTests] = useState<WrittenTestSummary[]>([]);
  const [writtenTestId, setWrittenTestId] = useState(initialId);
  const [students, setStudents] = useState<IcaDashboardRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void listWrittenTests({ status: "publicada", per_page: 100 }, { signal: controller.signal })
      .then((list) => {
        if (controller.signal.aborted) return;
        setTests(list.data);
        setWrittenTestId((current) => current || list.data[0]?.id || "");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(normalizeApiError(reason, "Não foi possível carregar as avaliações.").message);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!writtenTestId) {
      setStudents([]);
      setValues({});
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSuccess(null);
    void getIcaDashboard(writtenTestId, { turmaId: undefined }, { signal: controller.signal })
      .then((panel) => {
        if (controller.signal.aborted) return;
        const list =
          panel.students.length > 0
            ? panel.students
            : panel.rows.filter((row) => row.rowLevel === "aluno");
        setStudents(list);
        setValues(
          Object.fromEntries(
            list.map((row) => [
              row.studentId ?? row.id,
              row.proficiencia != null ? String(row.proficiencia) : "",
            ])
          )
        );
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setStudents([]);
        setError(normalizeApiError(reason, "Não foi possível carregar os alunos.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [writtenTestId]);

  const payload = useMemo<IcaProficiencyStudentInput[]>(
    () =>
      students
        .map((row) => {
          const id = row.studentId ?? row.id;
          const raw = (values[id] ?? "").trim();
          return {
            studentId: id,
            proficiencia: raw === "" ? null : Number(raw),
          };
        })
        .filter((item) => item.studentId),
    [students, values]
  );

  const invalid = payload.some(
    (item) => item.proficiencia != null && (!Number.isFinite(item.proficiencia) || item.proficiencia < 0)
  );

  async function handleSave() {
    if (!writtenTestId || invalid || !payload.length) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await postIcaProficiency(writtenTestId, payload);
      setSuccess(`${result.updated} aluno(s) atualizado(s). O ICA foi recalculado.`);
      for (const student of result.students) {
        setValues((prev) => ({
          ...prev,
          [student.student_id]: student.proficiencia != null ? String(student.proficiencia) : "",
        }));
      }
    } catch (reason) {
      setError(normalizeApiError(reason, "Não foi possível gravar a proficiência.").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Importar proficiência"
        description="Informe a proficiência equalizada Inep por aluno. Deixe em branco para limpar. O backend recalcula nível, status e ICA."
        icon={Upload}
      >
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.ica.resultados}>Voltar aos resultados</Link>
        </Button>
      </PageHeader>

      <SectionCard title="Avaliação">
        <div className="max-w-md space-y-1.5">
          <Label className="text-xs text-muted-foreground">Avaliação publicada</Label>
          <Select
            value={writtenTestId || ALL}
            onValueChange={(value) => setWrittenTestId(value === ALL ? "" : value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!tests.length ? <SelectItem value={ALL}>Nenhuma publicada</SelectItem> : null}
              {tests.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Proficiência gravada</AlertTitle>
          <AlertDescription>
            {success}{" "}
            <Link className="underline" href={ROUTES.ica.resultados}>
              Ver painel
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard
        title="Alunos do recorte"
        description="Valores numéricos na escala Inep. Em branco = sem proficiência (null)."
        actions={
          <Button onClick={() => void handleSave()} disabled={!writtenTestId || saving || invalid || !payload.length}>
            {saving ? "Gravando…" : "Gravar e recalcular"}
          </Button>
        }
      >
        {loading ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status atual</TableHead>
                  <TableHead className="w-40">Proficiência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((row) => {
                  const id = row.studentId ?? row.id;
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.schoolName ?? "—"}</TableCell>
                      <TableCell>{row.className ?? "—"}</TableCell>
                      <TableCell>{row.status ?? "—"}</TableCell>
                      <TableCell>
                        <Input
                          inputMode="decimal"
                          value={values[id] ?? ""}
                          onChange={(event) =>
                            setValues((prev) => ({
                              ...prev,
                              [id]: event.target.value,
                            }))
                          }
                          placeholder="ex.: 765.4"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!students.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {writtenTestId
                        ? "Nenhum aluno listado. Abra uma turma no painel ou confirme a aplicação da prova."
                        : "Selecione uma avaliação."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
        {invalid ? (
          <p className="mt-3 text-sm text-destructive">Há valores inválidos. Use número ≥ 0 ou deixe em branco.</p>
        ) : null}
      </SectionCard>
    </PageShell>
  );
}
