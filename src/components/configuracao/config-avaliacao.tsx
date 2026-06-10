"use client";

import { useState } from "react";
import { Settings2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, DifficultyBadge } from "@/components/shared/status-badge";
import { FormDialog } from "@/components/shared/form-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMockWordLists, getMockTexts } from "@/lib/mock";

export function ConfigAvaliacao() {
  const wordLists = getMockWordLists();
  const texts = getMockTexts();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        title="Configurar Avaliacao"
        description="Gerencie listas de palavras, textos narrativos e perguntas de compreensao."
        icon={Settings2}
      />

      <Tabs defaultValue="listas">
        <TabsList>
          <TabsTrigger value="listas">Listas de palavras</TabsTrigger>
          <TabsTrigger value="textos">Textos e perguntas</TabsTrigger>
        </TabsList>

        <TabsContent value="listas">
          <SectionCard
            title="Listas de palavras"
            description="Listas utilizadas nas avaliacoes de fluencia e ICA"
            actions={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova lista
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Padrao</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wordLists.map((wl) => (
                  <TableRow key={wl.id}>
                    <TableCell className="font-medium">{wl.name}</TableCell>
                    <TableCell>{wl.type}</TableCell>
                    <TableCell>{wl.items.length}</TableCell>
                    <TableCell>{wl.isDefault ? <StatusBadge status="padrao" /> : <StatusBadge status="inativo" label="Nao" />}</TableCell>
                    <TableCell>{wl.active ? <StatusBadge status="ativo" /> : <StatusBadge status="inativo" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="textos">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {texts.map((text) => (
              <SectionCard
                key={text.id}
                title={text.title}
                description={`${text.grade}º ano`}
                actions={
                  <div className="flex gap-2">
                    <DifficultyBadge difficulty={text.difficulty} />
                    {text.calibrated && <StatusBadge status="calibrado" />}
                  </div>
                }
              >
                <p className="line-clamp-3 text-sm text-muted-foreground">{text.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">{text.questions.length} perguntas de compreensao</p>
              </SectionCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nova lista de palavras"
        description="Cadastro demonstrativo de lista para avaliacao."
        icon={Settings2}
        onSubmit={() => setDialogOpen(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da lista</Label>
            <Input placeholder="Ex: Lista SAEB 3º ano" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Input placeholder="palavras / pseudopalavras" />
          </div>
        </div>
      </FormDialog>
    </PageShell>
  );
}
