"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listWordLists, type WordList } from "@/lib/api/afirme-reading";
import { createGuidedAutoSession } from "@/lib/api/afirme-reading/guided-auto-sessions";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { GuidedSelectionForm, type GuidedSelection } from "@/components/leitura-guiada/guided-selection-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

function pickDefault(lists: WordList[]) {
  return lists.find((list) => list.isDefault && list.active) ?? lists.find((list) => list.active) ?? null;
}

function WordListSelect({
  id,
  label,
  lists,
  value,
  onChange,
  loading,
}: {
  id: string;
  label: string;
  lists: WordList[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)} disabled={loading}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={loading ? "Carregando..." : "Não ler"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Não ler</SelectItem>
          {lists.map((list) => (
            <SelectItem key={list.id} value={list.id}>
              {list.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AutoSessionNewPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<GuidedSelection | null>(null);
  const [includeText, setIncludeText] = useState(true);
  const [knownLists, setKnownLists] = useState<WordList[]>([]);
  const [uncommonLists, setUncommonLists] = useState<WordList[]>([]);
  const [knownId, setKnownId] = useState("");
  const [uncommonId, setUncommonId] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [creating, setCreating] = useState(false);

  const gradeId = selection?.text.gradeId;
  useEffect(() => {
    if (!gradeId) return;
    let cancelled = false;
    setLoadingLists(true);
    Promise.all([
      listWordLists({ kind: "PALAVRAS", active: true, gradeId }),
      listWordLists({ kind: "POUCO_COMUNS", active: true, gradeId }),
    ])
      .then(([known, uncommon]) => {
        if (cancelled) return;
        setKnownLists(known);
        setUncommonLists(uncommon);
        setKnownId(pickDefault(known)?.id ?? "");
        setUncommonId(pickDefault(uncommon)?.id ?? "");
      })
      .catch((error) => {
        if (!cancelled) toast.error(normalizeApiError(error, "Não foi possível carregar as listas de palavras.").message);
      })
      .finally(() => !cancelled && setLoadingLists(false));
    return () => {
      cancelled = true;
    };
  }, [gradeId]);

  const hasPart = includeText || Boolean(knownId) || Boolean(uncommonId);

  async function handleCreate() {
    if (!selection) return;
    if (!hasPart) {
      toast.error("Escolha ao menos uma parte: o texto ou uma lista de palavras.");
      return;
    }
    setCreating(true);
    try {
      const session = await createGuidedAutoSession({
        studentId: selection.student.id,
        ...(includeText ? { readingTextId: selection.text.id } : {}),
        ...(knownId ? { wordsWordListId: knownId } : {}),
        ...(uncommonId ? { uncommonWordListId: uncommonId } : {}),
      });
      toast.success("Sessão criada. Grave a leitura de cada parte.");
      router.push(ROUTES.leitura.automatica.detalhe(session.id));
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível criar a leitura automática.").message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Praticar" title="Nova leitura automática" icon={Bot}>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href={ROUTES.leitura.automatica.root}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      {!selection ? (
        <GuidedSelectionForm onStart={setSelection} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Partes da leitura</CardTitle>
            <CardDescription>
              {selection.student.name} · {selection.schoolClass.name} · {selection.school.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <Checkbox checked={includeText} onCheckedChange={(value) => setIncludeText(value === true)} />
              Texto: <span className="font-medium">{selection.text.title}</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <WordListSelect
                id="auto-palavras"
                label="Palavras conhecidas"
                lists={knownLists}
                value={knownId}
                onChange={setKnownId}
                loading={loadingLists}
              />
              <WordListSelect
                id="auto-pouco-comuns"
                label="Palavras pouco comuns"
                lists={uncommonLists}
                value={uncommonId}
                onChange={setUncommonId}
                loading={loadingLists}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              O ICA só é calculado com as três partes e a compreensão do texto. Com menos partes, saem a precisão e o
              PLCM. A correção usa reconhecimento de voz no servidor.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSelection(null)} disabled={creating}>
                Trocar aluno ou texto
              </Button>
              <Button onClick={() => void handleCreate()} disabled={creating || !hasPart}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Criar e gravar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
