"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, BookOpenCheck, Download, GraduationCap, School, Users } from "lucide-react";
import {
  downloadIcaResultsCsv,
  getIcaDashboard,
  getIcaSkillMap,
  type IcaDashboard,
  type IcaDashboardQuery,
  type IcaDashboardRow,
  type IcaSkillMap,
} from "@/lib/api/afirme-reading/ica-results";
import { getWrittenTest, listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { WrittenTestNamedRef, WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { listClassesBySchool } from "@/lib/api/students";
import { ICA_BRAND } from "@/lib/ica/brand";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { ChipFilter } from "@/components/shared/chip-filter";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "all";

interface NamedOption {
  id: string;
  name: string;
}

interface ClassOption extends NamedOption {
  schoolId: string | null;
  gradeId: string | null;
}

function formatOne(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Indisponível";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPercent(value: number | null | undefined) {
  const text = formatOne(value);
  return text === "Indisponível" ? text : `${text}%`;
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : "—";
}

function aptLabel(value: number | boolean | null | undefined) {
  if (value === true) return "Apto";
  if (value === false) return "Não apto";
  return "—";
}

function SelectFilter({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: NamedOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function IcaResultsPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para consultar os resultados do ICA.">
      <IcaResultsContent />
    </IcaCityScope>
  );
}

function IcaResultsContent() {
  const [tests, setTests] = useState<WrittenTestSummary[]>([]);
  const [schools, setSchools] = useState<WrittenTestNamedRef[]>([]);
  const [grades, setGrades] = useState<WrittenTestNamedRef[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [shiftByClass, setShiftByClass] = useState<Record<string, string>>({});
  const [writtenTestId, setWrittenTestId] = useState("");
  const [schoolId, setSchoolId] = useState(ALL);
  const [gradeId, setGradeId] = useState(ALL);
  const [classId, setClassId] = useState(ALL);
  const [studentId, setStudentId] = useState(ALL);
  const [shift, setShift] = useState(ALL);
  const [aptFilter, setAptFilter] = useState(ALL);
  const [dashboard, setDashboard] = useState<IcaDashboard | null>(null);
  const [skills, setSkills] = useState<IcaSkillMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void listWrittenTests({ status: "publicada", per_page: 100 }, { signal: controller.signal })
      .then((list) => {
        if (!controller.signal.aborted) setTests(list.data);
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
      setSchools([]);
      setGrades([]);
      setClasses([]);
      return;
    }
    const controller = new AbortController();
    void getWrittenTest(writtenTestId)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setSchools(detail.schools ?? []);
        setGrades(detail.grades ?? []);
        setClasses(
          (detail.classes ?? []).map((item) => ({
            id: item.id,
            name: item.name ?? "Turma",
            schoolId: item.schoolId,
            gradeId: item.gradeId,
          }))
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSchools([]);
          setGrades([]);
          setClasses([]);
        }
      });
    return () => controller.abort();
  }, [writtenTestId]);

  const schoolIds = useMemo(() => schools.map((item) => item.id).filter(Boolean).join(","), [schools]);

  useEffect(() => {
    const ids = schoolIds ? schoolIds.split(",") : [];
    if (!ids.length) {
      setShiftByClass({});
      return;
    }
    let active = true;
    void Promise.all(ids.map((id) => listClassesBySchool(id).catch(() => []))).then((groups) => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const group of groups) {
        for (const item of group) {
          const value = item.shift?.trim();
          if (value) next[item.id] = value;
        }
      }
      setShiftByClass(next);
    });
    return () => {
      active = false;
    };
  }, [schoolIds]);

  const query = useMemo<IcaDashboardQuery>(
    () => ({
      escolaId: schoolId === ALL ? undefined : schoolId,
      serieId: gradeId === ALL ? undefined : gradeId,
      turmaId: classId === ALL ? undefined : classId,
      estudanteId: studentId === ALL ? undefined : studentId,
    }),
    [classId, gradeId, schoolId, studentId]
  );

  useEffect(() => {
    if (!writtenTestId) {
      setDashboard(null);
      setSkills(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void Promise.all([
      getIcaDashboard(writtenTestId, query, { signal: controller.signal }),
      getIcaSkillMap(writtenTestId, query, { signal: controller.signal }),
    ])
      .then(([panel, map]) => {
        if (controller.signal.aborted) return;
        setDashboard(panel);
        setSkills(map);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setDashboard(null);
        setSkills(null);
        setError(normalizeApiError(reason, "Não foi possível carregar os resultados.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, writtenTestId]);

  const gradeOptions = useMemo(() => {
    const allowed =
      schoolId === ALL
        ? null
        : new Set(classes.filter((item) => item.schoolId === schoolId && item.gradeId).map((item) => item.gradeId));
    return grades
      .filter((item) => item.id && (allowed == null || allowed.size === 0 || allowed.has(item.id)))
      .map((item) => ({ id: item.id, name: item.name ?? "Série" }));
  }, [classes, grades, schoolId]);

  const shiftOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of classes) {
      if (schoolId !== ALL && item.schoolId !== schoolId) continue;
      if (gradeId !== ALL && item.gradeId !== gradeId) continue;
      const value = shiftByClass[item.id];
      if (value) values.add(value);
    }
    return [...values]
      .sort((left, right) => left.localeCompare(right, "pt-BR"))
      .map((value) => ({ value, label: value }));
  }, [classes, gradeId, schoolId, shiftByClass]);

  const classOptions = useMemo(
    () =>
      classes
        .filter((item) => {
          if (schoolId !== ALL && item.schoolId !== schoolId) return false;
          if (gradeId !== ALL && item.gradeId !== gradeId) return false;
          if (shift !== ALL && shiftByClass[item.id] !== shift) return false;
          return true;
        })
        .map((item) => ({ id: item.id, name: item.name })),
    [classes, gradeId, schoolId, shift, shiftByClass]
  );

  const schoolOptions = schools.filter((item) => item.id).map((item) => ({ id: item.id, name: item.name ?? "Escola" }));
  const testOptions = tests.map((item) => ({ id: item.id, name: item.title }));
  const studentRows = dashboard?.scope.level === "turma";
  const visibleRows = (dashboard?.rows ?? []).filter((row) => {
    if (!studentRows || aptFilter === ALL || row.rowLevel !== "aluno") return true;
    if (aptFilter === "apto") return row.apt === true;
    return row.apt === false;
  });
  const officialMissing =
    dashboard != null &&
    (dashboard.proficiency_inep.status === "SEM_DADOS" || dashboard.proficiency_inep.ica_percentage == null);

  function selectTest(value: string) {
    setWrittenTestId(value === ALL ? "" : value);
    setSchoolId(ALL);
    setGradeId(ALL);
    setClassId(ALL);
    setStudentId(ALL);
    setShift(ALL);
    setAptFilter(ALL);
  }

  function selectSchool(value: string) {
    setSchoolId(value);
    setGradeId(ALL);
    setClassId(ALL);
    setStudentId(ALL);
    setShift(ALL);
  }

  function selectGrade(value: string) {
    setGradeId(value);
    setClassId(ALL);
    setStudentId(ALL);
  }

  function selectClass(value: string) {
    setClassId(value);
    setStudentId(ALL);
    setAptFilter(ALL);
  }

  function selectShift(value: string) {
    setShift(value);
    if (value !== ALL && classId !== ALL && shiftByClass[classId] !== value) {
      setClassId(ALL);
      setStudentId(ALL);
    }
  }

  function openRow(row: IcaDashboardRow) {
    if (row.rowLevel === "escola" && row.escolaId) selectSchool(row.escolaId);
    else if (row.rowLevel === "serie" && row.serieId) selectGrade(row.serieId);
    else if (row.rowLevel === "turma" && row.turmaId) selectClass(row.turmaId);
    else if (row.rowLevel === "aluno" && row.studentId) setStudentId(row.studentId);
  }

  async function downloadCsv() {
    if (!writtenTestId) return;
    setDownloading(true);
    try {
      await downloadIcaResultsCsv(writtenTestId, query);
    } catch (reason) {
      setError(normalizeApiError(reason, "Não foi possível baixar o CSV.").message);
    } finally {
      setDownloading(false);
    }
  }

  const scopeLabel = dashboard
    ? [
        "Município",
        dashboard.scope.escolaName,
        dashboard.scope.serieName,
        dashboard.scope.turmaName,
        dashboard.scope.estudanteName,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Resultados"
        description="Participação, IAD diagnóstico e habilidades no recorte do município, da escola, da série, da turma ou do aluno."
        icon={BarChart3}
      />

      <SectionCard title="Filtros" description="Escolas, séries e turmas continuam em lista. Turno e situação usam opções fixas.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectFilter label="Avaliação" value={writtenTestId || ALL} options={testOptions} onChange={selectTest} />
          <SelectFilter
            label="Escola"
            value={schoolId}
            options={schoolOptions}
            disabled={!writtenTestId}
            onChange={selectSchool}
          />
          <SelectFilter
            label="Série"
            value={gradeId}
            options={gradeOptions}
            disabled={!writtenTestId}
            onChange={selectGrade}
          />
          <SelectFilter
            label="Turma"
            value={classId}
            options={classOptions}
            disabled={!writtenTestId}
            onChange={selectClass}
          />
        </div>
        <div className="mt-4 space-y-3">
          {shiftOptions.length ? (
            <ChipFilter
              label="Turno"
              value={shiftOptions.some((item) => item.value === shift) ? shift : ALL}
              onChange={selectShift}
              options={[{ value: ALL, label: "Todos" }, ...shiftOptions]}
            />
          ) : null}
          {studentRows ? (
            <div className="space-y-1">
              <ChipFilter
                label="Situação"
                value={aptFilter}
                onChange={setAptFilter}
                options={[
                  { value: ALL, label: "Todos" },
                  { value: "apto", label: "Apto" },
                  { value: "nao", label: "Não apto" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                A situação filtra só a lista de alunos. Os cartões continuam com o recorte inteiro da turma.
              </p>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {!writtenTestId ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Escolha uma avaliação</AlertTitle>
          <AlertDescription>Os resultados aparecem depois de selecionar uma avaliação publicada.</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Resultados indisponíveis</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {dashboard && officialMissing ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>ICA oficial indisponível</AlertTitle>
          <AlertDescription>
            A prova ainda não tem proficiência equalizada na escala do Inep. A nota e o IAD-AFIRME permanecem indicadores
            diagnósticos e não são convertidos em proficiência oficial.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard variant="metric" label="Estudantes previstos" value={dashboard?.participation.expected ?? 0} icon={Users} loading={loading} />
        <StatCard
          variant="metric"
          label="Avaliados com 19 notas"
          value={dashboard?.participation.evaluated_diagnostic ?? 0}
          icon={BookOpenCheck}
          loading={loading}
        />
        <StatCard
          variant="metric"
          label="Participação"
          value={formatPercent(dashboard?.participation.percentage)}
          icon={GraduationCap}
          loading={loading}
        />
        <StatCard
          variant="metric"
          label="IAD-AFIRME (diagnóstico)"
          value={formatPercent(dashboard?.diagnostic.iad_percentage)}
          icon={BarChart3}
          loading={loading}
        />
        <StatCard
          variant="featured"
          label="ICA — referência Inep"
          value={formatPercent(dashboard?.proficiency_inep.ica_percentage)}
          icon={School}
          loading={loading}
          trend={officialMissing ? "Sem dados de proficiência equalizada" : undefined}
        />
      </section>

      {scopeLabel ? <p className="text-sm text-muted-foreground">Recorte: {scopeLabel}</p> : null}

      <SectionCard
        title={tableTitle(dashboard?.scope.level)}
        description="A participação conta a matrícula do recorte, inclusive quem ainda não foi liberado. A nota usa só as correções publicadas, com uma casa decimal."
        actions={
          <Button variant="outline" size="sm" onClick={() => void downloadCsv()} disabled={!writtenTestId || downloading}>
            <Download className="h-4 w-4" />
            {downloading ? "Baixando…" : "CSV"}
          </Button>
        }
      >
        {loading && !dashboard ? (
          <Skeleton className="h-48" />
        ) : (
          <ResultsTable rows={visibleRows} studentList={Boolean(studentRows || dashboard?.scope.level === "aluno")} onOpen={openRow} />
        )}
      </SectionCard>

      {dashboard?.student ? (
        <SectionCard
          title={dashboard.student.student_name}
          description={[dashboard.student.school_name, dashboard.student.serie_name, dashboard.student.class_name]
            .filter(Boolean)
            .join(" · ")}
          actions={
            studentId !== ALL ? (
              <Button variant="outline" size="sm" onClick={() => setStudentId(ALL)}>
                Voltar à turma
              </Button>
            ) : null
          }
        >
          <StudentDetail student={dashboard.student} />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Habilidades"
        description={
          skills
            ? `${skills.valid_attempts.toLocaleString("pt-BR")} finalizados neste recorte. O peso é a parte dos 34 pontos.`
            : "Aproveitamento das habilidades no recorte selecionado."
        }
      >
        {loading && !skills ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="space-y-4">
            {(skills?.skills ?? []).map((skill) => (
              <div key={skill.skill_code || skill.skill_label} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {skill.skill_code ? `${skill.skill_code} · ` : ""}
                    {skill.skill_label}
                  </span>
                  <span className="text-muted-foreground">
                    {skill.items.join(", ") || "Sem itens"} · peso {formatPercent(skill.relative_weight_percentage)} ·{" "}
                    {formatPercent(skill.performance_percentage)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(skill.performance_percentage ?? 0, 100)}%`, background: "var(--system-gradient)" }}
                  />
                </div>
              </div>
            ))}
            {!skills?.skills.length ? <p className="text-sm text-muted-foreground">Nenhuma habilidade neste recorte.</p> : null}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

function tableTitle(level: IcaDashboard["scope"]["level"] | undefined) {
  if (level === "escola") return "Séries";
  if (level === "serie") return "Turmas";
  if (level === "turma") return "Alunos finalizados";
  if (level === "aluno") return "Aluno";
  return "Escolas";
}

function ResultsTable({
  rows,
  studentList,
  onOpen,
}: {
  rows: IcaDashboardRow[];
  studentList: boolean;
  onOpen: (row: IcaDashboardRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {studentList ? (
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Leitura</TableHead>
              <TableHead>Palavras</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          ) : (
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Previstos</TableHead>
              <TableHead>Avaliados</TableHead>
              <TableHead>Participação</TableHead>
              <TableHead>Aptos</TableHead>
              <TableHead>IAD</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {rows.map((row) =>
            studentList ? (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => onOpen(row)}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.className ?? "—"}</TableCell>
                <TableCell>{formatCount(row.reading)}</TableCell>
                <TableCell>{formatCount(row.words)}</TableCell>
                <TableCell>{formatCount(row.text)}</TableCell>
                <TableCell>{formatOne(row.score)}</TableCell>
                <TableCell>{aptLabel(row.apt)}</TableCell>
              </TableRow>
            ) : (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => onOpen(row)}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{formatCount(row.expected)}</TableCell>
                <TableCell>{formatCount(row.evaluated_diagnostic)}</TableCell>
                <TableCell>{formatPercent(row.percentage)}</TableCell>
                <TableCell>{formatCount(typeof row.apt === "number" ? row.apt : null)}</TableCell>
                <TableCell>{formatPercent(row.iad_percentage)}</TableCell>
                <TableCell>{formatOne(row.score)}</TableCell>
              </TableRow>
            )
          )}
          {!rows.length ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Nenhum resultado neste recorte.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function StudentDetail({ student }: { student: NonNullable<IcaDashboard["student"]> }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Leitura", formatCount(student.reading)],
          ["Palavras", formatCount(student.words)],
          ["Texto", formatCount(student.text)],
          [
            "Total (0–34)",
            student.reading != null && student.words != null && student.text != null
              ? formatCount(student.reading + student.words + student.text)
              : "—",
          ],
          ["Nota", formatOne(student.score)],
          ["IAD-AFIRME", student.finalized ? (student.apt ? "Apto" : "Não apto") : "Não finalizado"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Habilidade</TableHead>
              <TableHead>Pontos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {student.items.map((item) => (
              <TableRow key={`${item.number ?? "item"}-${item.code ?? ""}`}>
                <TableCell>{item.number ?? "—"}{item.code ? ` · ${item.code}` : ""}</TableCell>
                <TableCell>{[item.skill_code, item.skill_label].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell>
                  {formatCount(item.points)} / {formatCount(item.max_points)}
                </TableCell>
              </TableRow>
            ))}
            {!student.items.length ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  Itens ainda não disponíveis.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
