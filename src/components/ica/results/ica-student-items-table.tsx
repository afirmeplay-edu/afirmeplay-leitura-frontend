"use client";

import type { IcaDashboardStudent, IcaStudentItem } from "@/lib/api/afirme-reading/ica-results";
import { formatIcaSkillDisplay } from "@/lib/ica/skill-display";
import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatPoints(points: number | null | undefined, max: number | null | undefined) {
  const obtained = typeof points === "number" && Number.isFinite(points) ? points : null;
  const maximum = typeof max === "number" && Number.isFinite(max) ? max : null;
  if (obtained == null && maximum == null) return "—";
  if (maximum == null) return String(obtained);
  if (obtained == null) return `— / ${maximum}`;
  return `${obtained} / ${maximum}`;
}

function SkillCell({ item }: { item: IcaStudentItem }) {
  const display = formatIcaSkillDisplay(item.skill_code, item.skill_label);
  if (!display) {
    return <span className="text-muted-foreground">Sem habilidade</span>;
  }
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="font-medium">{display.code}</p>
      <p className="text-xs text-muted-foreground">
        {display.uncatalogued ? display.label : display.label !== display.code ? display.label : null}
      </p>
    </div>
  );
}

export function IcaStudentItemsTable({
  student,
  loading,
}: {
  student: IcaDashboardStudent | null;
  loading?: boolean;
}) {
  if (!student && !loading) return null;

  const items = student?.items ?? [];
  const title = student?.student_name
    ? `Itens de ${student.student_name}`
    : "Itens do estudante";

  return (
    <SectionCard
      title={title}
      description="Pontuação por item da correção finalizada, com a habilidade catalogada da questão."
    >
      {loading ? <Skeleton className="h-40" /> : null}
      {!loading ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nº</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Habilidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={`${item.code ?? "item"}-${item.number ?? index}`}>
                  <TableCell className="tabular-nums">{item.number ?? "—"}</TableCell>
                  <TableCell className="font-medium">{item.code ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPoints(item.points, item.max_points)}
                  </TableCell>
                  <TableCell>
                    <SkillCell item={item} />
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {student?.finalized
                      ? "Nenhum item devolvido para este estudante."
                      : "Correção ainda não finalizada — os itens aparecem após a correção."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </SectionCard>
  );
}
