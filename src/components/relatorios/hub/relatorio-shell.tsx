"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { RelatorioFluenciaProvider, useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { RelatorioChipFilters } from "@/components/relatorios/hub/relatorio-chip-filters";

interface RelatorioShellProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function RelatorioShell(props: RelatorioShellProps) {
  return (
    <RelatorioFluenciaProvider>
      <RelatorioShellInner {...props} />
    </RelatorioFluenciaProvider>
  );
}

function RelatorioShellInner({ title, description, icon, children }: RelatorioShellProps) {
  const { catalogLoading, catalogError, reportLoading, reportError, relatorio } = useRelatorioFluencia();

  return (
    <PageShell>
      <AdminCityPicker />
      <PageHeader title={title} description={description} icon={icon}>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.leitura.relatorios}>Hub de relatórios</Link>
        </Button>
      </PageHeader>

      <SectionCard title="Filtros" description="Listas para escolas e turmas. Edição e turno em chips.">
        <RelatorioChipFilters />
      </SectionCard>

      {catalogError || reportError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Relatório indisponível</AlertTitle>
          <AlertDescription>{catalogError || reportError}</AlertDescription>
        </Alert>
      ) : null}

      {catalogLoading || (reportLoading && !relatorio) ? <Skeleton className="h-48" /> : null}
      {!catalogLoading && (relatorio || reportError) ? children : null}
      {!catalogLoading && !reportLoading && !relatorio && !reportError ? (
        <p className="text-sm text-muted-foreground">Selecione os filtros para carregar o relatório.</p>
      ) : null}
    </PageShell>
  );
}
