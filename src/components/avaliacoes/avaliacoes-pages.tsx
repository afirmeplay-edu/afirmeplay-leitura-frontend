"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers, BarChart3, Trash2 } from "lucide-react";
import { DataListPage } from "@/components/shared/data-list-page";
import { FormPage } from "@/components/shared/form-page";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { IcaLevelBadge, StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMockEvaluations, getMockEvaluationById } from "@/lib/mock";

export function AvaliacoesListPage() {
  const evals = getMockEvaluations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DataListPage
        title="Avaliacoes aplicadas"
        description="Historico de avaliacoes de leitura e fluencia."
        icon={Layers}
        items={evals}
        createHref="/app/avaliacoes/nova"
        createLabel="Nova avaliacao"
        searchFilter={(e, q) => e.studentName.toLowerCase().includes(q) || e.textTitle.toLowerCase().includes(q)}
        columns={[
          { key: "student", header: "Aluno", render: (e) => e.studentName },
          { key: "text", header: "Texto", render: (e) => e.textTitle },
          { key: "date", header: "Data", render: (e) => e.date },
          {
            key: "type",
            header: "Tipo",
            render: (e) => <StatusBadge status={e.type === "fluencia" ? "fluencia" : "guiada"} />,
          },
          { key: "ica", header: "ICA", render: (e) => <IcaLevelBadge level={e.icaLevel} /> },
          { key: "accuracy", header: "Precisao", render: (e) => `${e.accuracy}%` },
        ]}
        actions={(e) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Acoes</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/app/avaliacoes/${e.id}`}>Ver detalhe</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/app/avaliacoes/${e.id}/editar`}>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmOpen(true)}>Excluir (mock)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir avaliacao?"
        description="Esta acao e apenas demonstrativa no modo mock."
        confirmLabel="Excluir"
        variant="destructive"
        icon={Trash2}
        onConfirm={() => setConfirmOpen(false)}
      />
    </>
  );
}

export function AvaliacaoDetailPage({ id }: { id: string }) {
  const ev = getMockEvaluationById(id);
  if (!ev) return <p>Avaliacao nao encontrada.</p>;
  return (
    <PageShell>
      <PageHeader title="Detalhe da avaliacao" description={`${ev.studentName} · ${ev.textTitle}`} icon={BarChart3}>
        <Button variant="outline" asChild>
          <Link href={`/app/avaliacoes/${id}/editar`}>Editar</Link>
        </Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="PLCM" value={ev.plcm} icon={BarChart3} />
        <StatCard label="Precisao" value={`${ev.accuracy}%`} icon={BarChart3} />
        <StatCard label="Prosodia" value={`${ev.prosody}/5`} icon={BarChart3} />
        <StatCard label="ICA" value={ev.icaLevel ?? "-"} icon={BarChart3} />
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={ev.type === "fluencia" ? "fluencia" : "guiada"} />
        <IcaLevelBadge level={ev.icaLevel} />
      </div>
    </PageShell>
  );
}

export function AvaliacaoFormPage({ id }: { id?: string }) {
  const ev = id ? getMockEvaluationById(id) : null;
  return (
    <FormPage title={ev ? "Editar avaliacao" : "Nova avaliacao"} icon={Layers} backHref="/app/avaliacoes" onSubmit={(e) => e.preventDefault()}>
      <p className="text-muted-foreground">Formulario mock para registro manual de avaliacao.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Aluno</Label><Input defaultValue={ev?.studentName} /></div>
        <div className="space-y-2"><Label>Texto</Label><Input defaultValue={ev?.textTitle} /></div>
        <div className="space-y-2"><Label>PLCM</Label><Input type="number" defaultValue={ev?.plcm} /></div>
        <div className="space-y-2"><Label>Precisao (%)</Label><Input type="number" defaultValue={ev?.accuracy} /></div>
      </div>
      <Button type="submit" className="mt-4">Salvar (mock)</Button>
    </FormPage>
  );
}
