"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Layers, Users } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CARDS = [
  {
    href: ROUTES.leitura.relatoriosPainel,
    title: "Painel de resultados",
    description: "IFL, evolução no ano e visão consolidada da edição.",
    icon: BarChart3,
  },
  {
    href: ROUTES.leitura.relatoriosParticipacao,
    title: "Participação",
    description: "Previstos, avaliados e percentual no recorte escolhido.",
    icon: Users,
  },
  {
    href: ROUTES.leitura.relatoriosNiveis,
    title: "Níveis / perfil leitor",
    description: "Distribuição PL1–LF e leitura dos níveis no recorte.",
    icon: Layers,
  },
  {
    href: ROUTES.leitura.relatoriosEscolas,
    title: "Escolas e turmas",
    description: "Comparativo por escola e por turma, além do recorte de turma.",
    icon: Building2,
  },
  {
    href: ROUTES.leitura.relatoriosFluencia,
    title: "Relatório de fluência",
    description: "Relatório completo já existente, com tabela e perfil individual.",
    icon: BarChart3,
  },
];

export function RelatoriosHubPage() {
  return (
    <PageShell>
      <PageHeader
        title="Relatórios de Leitura"
        description="Fluência leitora (IFL, perfil PL1–LF, participação). O painel ICA (≥ 743 / níveis Inep) fica no sistema ICA."
        icon={BarChart3}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <Card className="h-full transition-colors group-hover:border-[var(--system-text)]/40">
                <CardHeader className="space-y-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-hero-from to-brand-hero-to text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    {card.title}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
