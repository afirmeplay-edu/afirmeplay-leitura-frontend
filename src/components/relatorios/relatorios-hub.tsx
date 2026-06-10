"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { IcaLevelBadge, StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { getMockIcaReport, getMockEvaluations } from "@/lib/mock";

const PIE_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#2563EB"];

export function RelatoriosHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aba = searchParams.get("aba") ?? "ica";
  const ica = getMockIcaReport();
  const evaluations = getMockEvaluations();

  const setAba = (value: string) => {
    router.push(`/app/relatorios?aba=${value}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="Relatorios"
        description="Analise de desempenho em fluencia, ICA e visao geral do sistema."
        icon={BarChart3}
      />

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="ica">ICA</TabsTrigger>
          <TabsTrigger value="fluencia">Fluencia</TabsTrigger>
          <TabsTrigger value="geral">Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="ica" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Elegiveis" value={ica.summary.eligible} icon={BarChart3} />
            <StatCard label="Avaliados" value={ica.summary.evaluated} icon={BarChart3} />
            <StatCard label="Participacao" value={`${ica.summary.participationRate}%`} icon={BarChart3} />
            <StatCard label="Media ICA" value={ica.summary.average} icon={BarChart3} />
          </div>

          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
            <SectionCard title="Distribuicao por nivel">
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ica.levels}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis width={32} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Niveis INEP">
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ica.levels} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius="70%" label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {ica.levels.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Estudantes avaliados">
            <ResponsiveTable
              data={ica.students}
              columns={[
                { key: "name", header: "Estudante", render: (s) => s.name },
                { key: "class", header: "Turma", render: (s) => s.className },
                { key: "ica", header: "ICA", render: (s) => (s.evaluated ? s.icaScore : "-") },
                { key: "level", header: "Nivel", render: (s) => <IcaLevelBadge level={s.level} /> },
              ]}
            />
          </SectionCard>

          <SectionCard title="Parecer tecnico-pedagogico" variant="highlight">
            <p className="text-sm leading-relaxed">{ica.opinion}</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="fluencia">
          <SectionCard title="Relatorio de fluencia">
            <ResponsiveTable
              data={evaluations.filter((e) => e.type === "fluencia")}
              columns={[
                { key: "student", header: "Aluno", render: (e) => e.studentName },
                { key: "text", header: "Texto", render: (e) => e.textTitle },
                { key: "plcm", header: "PLCM", render: (e) => e.plcm },
                { key: "accuracy", header: "Precisao", render: (e) => `${e.accuracy}%` },
                { key: "prosody", header: "Prosodia", render: (e) => `${e.prosody}/5` },
              ]}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="geral">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total avaliacoes" value={evaluations.length} icon={BarChart3} />
            <StatCard
              label="Media precisao"
              value={`${Math.round(evaluations.reduce((a, e) => a + e.accuracy, 0) / evaluations.length)}%`}
              icon={BarChart3}
            />
            <StatCard
              label="Media PLCM"
              value={Math.round(evaluations.reduce((a, e) => a + e.plcm, 0) / evaluations.length)}
              icon={BarChart3}
            />
          </div>
          <SectionCard title="Por tipo de avaliacao" className="mt-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="fluencia" label={`Fluencia: ${evaluations.filter((e) => e.type === "fluencia").length}`} />
              <StatusBadge status="guiada" label={`Guiada: ${evaluations.filter((e) => e.type === "guiada").length}`} />
              <StatusBadge status="ica" label={`Com ICA: ${evaluations.filter((e) => e.icaLevel != null).length}`} />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
