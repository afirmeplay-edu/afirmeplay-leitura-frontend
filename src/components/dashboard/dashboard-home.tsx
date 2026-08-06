"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Gauge, Home, Layers } from "lucide-react";
import { DASHBOARD_FEATURE_CARDS } from "@/config/navigation";
import { getMockEvaluations } from "@/lib/mock";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { FeatureCard } from "@/components/shared/feature-card";
import { SectionCard } from "@/components/shared/section-card";
import { IcaLevelBadge, StatusBadge } from "@/components/shared/status-badge";

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

export function DashboardHome() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Sistema de Leitura"
        title="Painel Afirme Play"
        description="Avaliacao de fluencia, precisao, compreensao e vocabulario alinhado aos descritores SAEB."
        icon={Home}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {KPI_ITEMS.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} />
        ))}
      </section>

      <section className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {DASHBOARD_FEATURE_CARDS.map((card) => (
          <FeatureCard
            key={card.href}
            href={card.href}
            label={card.label}
            description={card.description}
            accent={card.accent}
            badge={"badge" in card ? card.badge : undefined}
          />
        ))}
      </section>

      <SectionCard title="Avaliacoes recentes" description="Ultimas avaliacoes registradas no sistema">
        <div className="space-y-3">
          {evals.slice(0, 5).map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{ev.studentName}</p>
                <p className="truncate text-muted-foreground">
                  {ev.textTitle} · {ev.date}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <StatusBadge status={ev.type === "fluencia" ? "fluencia" : "guiada"} />
                <IcaLevelBadge level={ev.icaLevel} />
                <span className="text-xs text-muted-foreground">Precisao {ev.accuracy}%</span>
              </div>
            </div>
          ))}
          <Link href="/app/avaliacoes" className="text-sm font-medium text-primary hover:underline">
            Ver todas as avaliacoes
          </Link>
        </div>
      </SectionCard>
    </PageShell>
  );
}
