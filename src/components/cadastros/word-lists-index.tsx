"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteWordList,
  listWordLists,
  type Grade,
  type WordList,
} from "@/lib/api/afirme-reading";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WordListsIndexPageProps {
  kind: CatalogWordListKind;
}

function WordListsIndexContent({ kind }: WordListsIndexPageProps) {
  const config = WORD_LIST_KIND_CONFIG[kind];
  const [lists, setLists] = useState<WordList[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGradeId, setFilterGradeId] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<WordList | null>(null);

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades();
      setGrades(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as séries."));
    }
  }, []);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWordLists({
        kind,
        gradeId: filterGradeId === "all" ? undefined : filterGradeId,
      });
      setLists(data.filter((list) => belongsToWordListKind(list.kind, kind)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as listas."));
    } finally {
      setLoading(false);
    }
  }, [filterGradeId, kind]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  async function handleDelete() {
    if (!pendingDelete) return;
    await deleteWordList(pendingDelete.id);
    toast.success("Lista excluída com sucesso.");
    setPendingDelete(null);
    await loadLists();
  }

  return (
    <CadastrosShell
      title={config.title}
      description={config.description}
      icon={ClipboardList}
      actions={
        <Button asChild>
          <Link href={config.createHref}>
            <Plus className="mr-2 h-4 w-4" />
            {config.createLabel}
          </Link>
        </Button>
      }
    >
      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={filterGradeId} onValueChange={setFilterGradeId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filtrar série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as séries</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : `${lists.length} lista${lists.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando listas...
            </div>
          ) : lists.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">{config.emptyLabel}</p>
              <Button asChild className="mt-4">
                <Link href={config.createHref}>
                  <Plus className="mr-2 h-4 w-4" />
                  {config.createLabel}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {lists.map((list) => (
                  <div key={list.id} className="rounded-lg border p-4">
                    <p className="font-semibold text-bluebrand-deep">{list.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{list.grade?.name ?? "Série"}</Badge>
                      <Badge variant="secondary">{list.items.length} palavras</Badge>
                      {list.isDefault ? <Badge>Padrão</Badge> : null}
                      <Badge variant={list.active ? "success" : "outline"}>
                        {list.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={config.editHref(list.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setPendingDelete(list)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Série</TableHead>
                      <TableHead className="text-center">Palavras</TableHead>
                      <TableHead className="text-center">Padrão</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lists.map((list) => (
                      <TableRow key={list.id}>
                        <TableCell className="font-medium">
                          <Link href={config.editHref(list.id)} className="text-bluebrand-base hover:underline">
                            {list.name}
                          </Link>
                        </TableCell>
                        <TableCell>{list.grade?.name ?? "—"}</TableCell>
                        <TableCell className="text-center">{list.items.length}</TableCell>
                        <TableCell className="text-center">{list.isDefault ? "★" : "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={list.active ? "success" : "outline"}>
                            {list.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={config.editHref(list.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-700 hover:bg-red-50"
                              onClick={() => setPendingDelete(list)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Excluir lista?"
        description={
          pendingDelete
            ? `A lista "${pendingDelete.name}" será removida do catálogo.`
            : undefined
        }
        confirmLabel="Excluir"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDelete}
      />
    </CadastrosShell>
  );
}

export function WordListsIndexPage({ kind }: WordListsIndexPageProps) {
  const content = <WordListsIndexContent kind={kind} />;
  if (!WORD_LIST_KIND_CONFIG[kind].adminOnly) return content;

  return (
    <RoleGuard allow={isAdminRole} fallbackHref={CADASTROS_PATHS.poucoComuns}>
      {content}
    </RoleGuard>
  );
}
