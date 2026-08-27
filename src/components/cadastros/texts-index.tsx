"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteReadingText,
  listReadingTexts,
  type DifficultyLevel,
  type Grade,
  type ReadingText,
} from "@/lib/api/afirme-reading";
import { listGrades } from "@/lib/api/grades";
import { getApiErrorMessage } from "@/lib/api/errors";
import { CADASTROS_PATHS } from "@/lib/cadastros/config";
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

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "VERY_EASY", label: "Muito fácil" },
  { value: "EASY", label: "Fácil" },
  { value: "MEDIUM", label: "Médio" },
  { value: "HARD", label: "Difícil" },
  { value: "VERY_HARD", label: "Muito difícil" },
];

function difficultyLabel(level: DifficultyLevel) {
  return DIFFICULTY_OPTIONS.find((option) => option.value === level)?.label ?? level;
}

function questionsCountLabel(count: number) {
  return count === 1 ? "1 pergunta" : `${count} perguntas`;
}

export function TextsIndexPage() {
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGradeId, setFilterGradeId] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<ReadingText | null>(null);

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades();
      setGrades(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as séries."));
    }
  }, []);

  const loadTexts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReadingTexts({
        gradeId: filterGradeId === "all" ? undefined : filterGradeId,
        orderBy: "title",
      });
      setTexts(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar os textos."));
    } finally {
      setLoading(false);
    }
  }, [filterGradeId]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadTexts();
  }, [loadTexts]);

  async function handleDelete() {
    if (!pendingDelete) return;
    await deleteReadingText(pendingDelete.id);
    toast.success("Texto excluído com sucesso.");
    setPendingDelete(null);
    await loadTexts();
  }

  return (
    <CadastrosShell
      title="Textos e perguntas"
      description="Cadastre textos narrativos e, quando quiser, as perguntas de compreensão vinculadas a cada texto."
      icon={BookOpen}
      actions={
        <Button asChild>
          <Link href={`${CADASTROS_PATHS.textos}/novo`}>
            <Plus className="mr-2 h-4 w-4" />
            Novo texto
          </Link>
        </Button>
      }
    >
      <div className="mb-4">
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
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando textos...
        </div>
      ) : texts.length === 0 ? (
        <Card>
          <CardContent className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhum texto cadastrado.</p>
            <Button asChild className="mt-4">
              <Link href={`${CADASTROS_PATHS.textos}/novo`}>
                <Plus className="mr-2 h-4 w-4" />
                Novo texto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {texts.map((text) => {
            const questionCount = Array.isArray(text.questions) ? text.questions.length : null;
            return (
              <Card key={text.id} className="transition hover:bg-muted/30">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`${CADASTROS_PATHS.textos}/${text.id}`}
                      className="font-semibold text-bluebrand-deep hover:underline"
                    >
                      {text.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{text.grade?.name ?? "Série"}</Badge>
                      <Badge variant="secondary">{difficultyLabel(text.difficultyLevel)}</Badge>
                      {text.isCalibrated ? <Badge>Calibrado</Badge> : null}
                      {questionCount != null ? (
                        <Badge variant="outline">{questionsCountLabel(questionCount)}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {text.content.length > 220 ? `${text.content.slice(0, 220)}...` : text.content}
                    </p>
                    {text.source ? (
                      <p className="mt-1 text-xs text-muted-foreground">Fonte: {text.source}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${CADASTROS_PATHS.textos}/${text.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-700 hover:bg-red-50"
                      onClick={() => setPendingDelete(text)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Excluir texto?"
        description={
          pendingDelete
            ? `O texto "${pendingDelete.title}" e as perguntas vinculadas serão removidos.`
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
