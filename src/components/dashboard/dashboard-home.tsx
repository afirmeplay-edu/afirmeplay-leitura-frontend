"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Gauge,
  Headphones,
  Home,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { DASHBOARD_FEATURE_CARDS } from "@/config/navigation";
import { getMockEvaluations } from "@/lib/mock";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { IcaLevelBadge, StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShortcutTile } from "@/components/dashboard/shortcut-tile";

const evals = getMockEvaluations();
const avgIca = evals.length
  ? (evals.reduce((sum, e) => sum + (e.icaLevel ?? 0), 0) / evals.length).toFixed(1)
  : "-";

const KPI_ITEMS = [
  { label: "Avaliacoes", value: evals.length, icon: Layers },
  { label: "Media ICA", value: avgIca, icon: BarChart3 },
  { label: "Fluencia", value: evals.filter((e) => e.type === "fluencia").length, icon: Gauge },
  { label: "Leitura guiada", value: evals.filter((e) => e.type === "guiada").length, icon: BookOpen },
];

const SHORTCUT_ICONS: Record<string, LucideIcon> = {
  "/app/avaliacao-fluencia": Gauge,
  "/app/cadastros": ClipboardList,
  "/app/avaliacao-leitura-guiada": BookOpen,
  "/app/revisao-leitura-guiada": Headphones,
  "/app/relatorios?aba=ica": BarChart3,
};

export function DashboardHome() {
  return (
    <PageShell className="flex min-h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        eyebrow="Sistema de Leitura"
        title="Painel Afirme Play"
        description="Avaliacao de fluencia, precisao, compreensao e vocabulario."
        icon={Home}
      />

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {KPI_ITEMS.map((kpi) => (
          <StatCard key={kpi.label} compact label={kpi.label} value={kpi.value} icon={kpi.icon} />
        ))}
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {DASHBOARD_FEATURE_CARDS.map((card) => (
          <ShortcutTile
            key={card.href}
            href={card.href}
            label={card.label}
            description={card.description}
            accent={card.accent}
            badge={"badge" in card ? card.badge : undefined}
            icon={SHORTCUT_ICONS[card.href] ?? Layers}
          />
        ))}
      </section>

      <SectionCard
        className="flex min-h-0 flex-1 flex-col"
        title="Avaliacoes recentes"
        description="Ultimas avaliacoes registradas no sistema"
      >
        <div className="min-h-[22rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Texto · Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>ICA</TableHead>
                <TableHead>Precisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evals.slice(0, 5).map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ev.textTitle} · {ev.date}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ev.type === "fluencia" ? "fluencia" : "guiada"} />
                  </TableCell>
                  <TableCell>
                    <IcaLevelBadge level={ev.icaLevel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ev.accuracy}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Link href="/app/avaliacoes" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Ver todas as avaliacoes
          </Link>
        </div>
      </SectionCard>
    </PageShell>
  );
}
