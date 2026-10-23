"use client";

import Link from "next/link";
import { ClipboardCheck, FilePlus2, Library, ScanLine } from "lucide-react";
import { DASHBOARD_SHORTCUTS } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import { ICA_BRAND, ICA_TITLE } from "@/lib/ica/brand";
import { useAuthStore } from "@/stores/auth-store";
import { ShortcutTile } from "@/components/dashboard/shortcut-tile";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Library,
    title: "Cadastre ou reutilize questões",
    text: "Questões de múltipla escolha (2 a 8 alternativas). As do Afirme Play aparecem como somente leitura.",
  },
  {
    icon: ClipboardCheck,
    title: "Monte a avaliação",
    text: "20 itens: 16 de múltipla escolha, 3 abertas e 1 produção textual.",
  },
  {
    icon: ScanLine,
    title: "Aplique e corrija",
    text: "Cartão-resposta e correção automática — em breve.",
  },
];

export function IcaHome() {
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = canWriteIca(role);

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title={ICA_TITLE}
        description="Banco de questões e montagem das avaliações aplicadas no papel e corrigidas por cartão-resposta."
        icon={ClipboardCheck}
      >
        {canWrite ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={ROUTES.ica.questoes.nova}>
              <FilePlus2 className="h-4 w-4" />
              Nova questão
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Atalhos do Sistema ICA">
        {DASHBOARD_SHORTCUTS.ica.map((card) => (
          <ShortcutTile
            key={card.href}
            href={card.href}
            label={card.label}
            description={card.description}
            accent={card.accent}
            icon={card.icon}
            disabled={card.disabled}
            badge={card.badge}
          />
        ))}
      </section>

      <SectionCard
        title="Primeiros passos"
        description="Ainda não há avaliações do ICA. O caminho é este:"
        icon={ClipboardCheck}
      >
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-highlight/10 text-sm font-semibold text-brand-highlight">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-brand-highlight" aria-hidden />
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={ROUTES.ica.questoes.root}>Ver banco de questões</Link>
          </Button>
          {canWrite ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href={ROUTES.ica.questoes.nova}>Criar a primeira questão</Link>
            </Button>
          ) : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
