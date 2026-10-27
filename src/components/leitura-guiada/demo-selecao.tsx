"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { DifficultyBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { getMockStudents, getMockTexts } from "@/lib/mock";
import { ROUTES } from "@/config/routes";

export function DemoSelecao() {
  const router = useRouter();
  const students = getMockStudents().slice(0, 6);
  const texts = getMockTexts();

  return (
    <PageShell>
      <PageHeader
        title="Seleção rápida (demonstração)"
        description="Escolha um aluno e um texto para iniciar o fluxo de leitura guiada."
        icon={BookOpen}
      />

      <SectionCard title="Alunos" description="Selecione um estudante para a demonstração">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <div key={s.id} className="rounded-lg border p-4 transition hover:shadow-md">
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">ID: {s.id}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Textos" description="Clique em um texto para iniciar a sessão">
        <div className="grid gap-4 md:grid-cols-2">
          {texts.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rounded-lg border p-4 text-left transition hover:shadow-md"
              onClick={() => router.push(`${ROUTES.leitura.pratica.sessao}?aluno=alu-1&texto=${t.id}`)}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{t.title}</h3>
                <Badge variant="outline">{t.grade}º</Badge>
                <DifficultyBadge difficulty={t.difficulty} />
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{t.content}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <Link href={ROUTES.leitura.pratica.root} className="text-sm text-primary hover:underline">
        Voltar para a seleção completa
      </Link>
    </PageShell>
  );
}
