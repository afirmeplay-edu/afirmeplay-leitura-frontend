"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createWordList, getWordList, updateWordList, type Grade } from "@/lib/api/afirme-reading";
import { listGrades } from "@/lib/api/grades";
import { getApiErrorMessage } from "@/lib/api/errors";
import { isAdminRole } from "@/lib/auth/jwt";
import {
  belongsToWordListKind,
  CADASTROS_PATHS,
  WORD_LIST_KIND_CONFIG,
  type CatalogWordListKind,
} from "@/lib/cadastros/config";
import { RoleGuard } from "@/components/auth/role-guard";
import { CadastrosShell } from "@/components/cadastros/cadastros-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function parseItems(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

interface FormState {
  name: string;
  gradeId: string;
  itemsText: string;
  description: string;
  isDefault: boolean;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  gradeId: "",
  itemsText: "",
  description: "",
  isDefault: false,
  active: true,
};

interface WordListFormPageProps {
  kind: CatalogWordListKind;
  id?: string;
}

function WordListFormContent({ kind, id }: WordListFormPageProps) {
  const config = WORD_LIST_KIND_CONFIG[kind];
  const router = useRouter();
  const editing = Boolean(id);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades();
      setGrades(data);
      setForm((prev) => (prev.gradeId || !data[0] ? prev : { ...prev, gradeId: data[0].id }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as séries."));
    }
  }, []);

  const loadList = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getWordList(id);
      if (!belongsToWordListKind(list.kind, kind)) {
        toast.error("Esta lista não pertence a esta tela.");
        router.replace(config.listHref);
        return;
      }
      setForm({
        name: list.name,
        gradeId: list.gradeId ?? "",
        itemsText: list.items.join("\n"),
        description: list.description ?? "",
        isDefault: list.isDefault,
        active: list.active,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar a lista."));
      router.replace(config.listHref);
    } finally {
      setLoading(false);
    }
  }, [config.listHref, id, kind, router]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome da lista.");
      return;
    }
    if (!form.gradeId) {
      toast.error("Selecione a série.");
      return;
    }
    const items = parseItems(form.itemsText);
    if (items.length === 0) {
      toast.error("Adicione ao menos uma palavra.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        gradeId: form.gradeId,
        kind,
        items,
        description: form.description.trim() || null,
        isDefault: form.isDefault,
        active: form.active,
      };
      if (id) {
        await updateWordList(id, payload);
        toast.success("Lista atualizada com sucesso.");
      } else {
        await createWordList(payload);
        toast.success("Lista criada com sucesso.");
      }
      router.push(config.listHref);
    } catch (error) {
      toast.error(getApiErrorMessage(error, id ? "Falha ao atualizar a lista." : "Falha ao criar a lista."));
    } finally {
      setSaving(false);
    }
  }

  const itemCount = parseItems(form.itemsText).length;

  return (
    <CadastrosShell
      title={editing ? `Editar · ${config.title}` : `Nova · ${config.title}`}
      description={`O tipo é fixo nesta tela. Recomendamos cerca de ${config.recommendedCount} palavras.`}
      icon={ClipboardList}
      actions={
        <Button variant="outline" asChild>
          <Link href={config.listHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando lista...
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="lista-nome">Nome</Label>
                <Input
                  id="lista-nome"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Lista complementar — 2º ano"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Série</Label>
                <Select
                  value={form.gradeId || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, gradeId: value }))}
                  disabled={saving || grades.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lista-desc">Descrição</Label>
                <Input
                  id="lista-desc"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <Label htmlFor="lista-items">Palavras</Label>
                  <span className="text-xs text-muted-foreground">
                    {itemCount} palavra{itemCount === 1 ? "" : "s"} · sugerido: {config.recommendedCount}
                  </span>
                </div>
                <Textarea
                  id="lista-items"
                  value={form.itemsText}
                  onChange={(e) => setForm((prev) => ({ ...prev, itemsText: e.target.value }))}
                  className="min-h-[220px] font-mono text-sm"
                  placeholder={"NEVE\nLATA\nPIPOCA\n..."}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Uma por linha, ou separadas por vírgula / ponto e vírgula.
                </p>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lista-default"
                    checked={form.isDefault}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, isDefault: checked === true }))
                    }
                    disabled={saving}
                  />
                  <Label htmlFor="lista-default">Marcar como padrão para este tipo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lista-ativa"
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, active: checked === true }))
                    }
                    disabled={saving}
                  />
                  <Label htmlFor="lista-ativa">Lista ativa</Label>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" asChild disabled={saving}>
                  <Link href={config.listHref}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editing ? (
                    "Salvar alterações"
                  ) : (
                    "Criar lista"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </CadastrosShell>
  );
}

export function WordListFormPage({ kind, id }: WordListFormPageProps) {
  const content = <WordListFormContent kind={kind} id={id} />;
  if (!WORD_LIST_KIND_CONFIG[kind].adminOnly) return content;

  return (
    <RoleGuard allow={isAdminRole} fallbackHref={CADASTROS_PATHS.poucoComuns}>
      {content}
    </RoleGuard>
  );
}
