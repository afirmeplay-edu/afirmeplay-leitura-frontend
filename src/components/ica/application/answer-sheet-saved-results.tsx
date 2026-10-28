"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardCheck, RefreshCw } from "lucide-react";
import { listAnswerSheetCorrections } from "@/lib/api/afirme-reading/written-tests";
import type {
  AnswerSheetCorrectionsList,
  AnswerSheetObjectiveItem,
  AnswerSheetSavedStudent,
  AnswerSheetWritingProduction,
  AnswerSheetWritingScore,
  AnswerSheetWritingWord,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const WORD_MAX = 4;
const TEXT_MAX = 14;

const OBJECTIVE_STATUS: Record<string, { label: string; variant: "success" | "destructive" | "outline" | "warning" | "info" }> = {
  CORRETA: { label: "Correta", variant: "success" },
  INCORRETA: { label: "Incorreta", variant: "destructive" },
  EM_BRANCO: { label: "Em branco", variant: "outline" },
  INVALIDA: { label: "Inválida", variant: "warning" },
  PENDENTE: { label: "Pendente", variant: "info" },
};

const WRITING_STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  CONCLUIDA: { label: "Concluída", variant: "success" },
  PENDENTE_REVISAO: { label: "Pendente de revisão", variant: "warning" },
  ERRO: { label: "Erro", variant: "destructive" },
};

const CLASSIFICATION: Record<string, string> = {
  CORRETA: "Correta",
  PARCIAL: "Parcial",
  INCORRETA: "Incorreta",
};

const CONFIDENCE: Record<string, string> = {
  ALTA: "alta",
  MEDIA: "média",
  MÉDIA: "média",
  BAIXA: "baixa",
};

const SOURCE: Record<string, string> = {
  ia: "Automática",
  manual: "Manual",
};

const CRITERIA: Array<[string, string]> = [
  ["adequacao", "Adequação"],
  ["tipologia", "Tipologia"],
  ["uso_pagina", "Uso da página"],
  ["ortografia", "Ortografia"],
  ["pontuacao", "Pontuação"],
  ["coesao", "Coesão"],
  ["segmentacao", "Segmentação"],
];

function objectiveCountLabel(status: string, count: number) {
  const plural: Record<string, [string, string]> = {
    CORRETA: ["correta", "corretas"],
    INCORRETA: ["incorreta", "incorretas"],
    EM_BRANCO: ["em branco", "em branco"],
    INVALIDA: ["inválida", "inválidas"],
    PENDENTE: ["pendente", "pendentes"],
  };
  const [one, many] = plural[status] ?? [status.toLowerCase(), status.toLowerCase()];
  return `${count} ${count === 1 ? one : many}`;
}

function knownLabel(map: Record<string, string>, value: string) {
  if (!value) return "";
  return map[value] ?? value.replaceAll("_", " ").toLowerCase();
}

function scoreText(points: number | null, max: number) {
  return points == null ? "em aberto" : `${points}/${max}`;
}

function byNumber<T extends { number: number }>(items: T[]) {
  return [...items].sort((a, b) => a.number - b.number);
}

export function AnswerSheetSavedResults({
  writtenTestId,
  reloadToken = 0,
}: {
  writtenTestId: string;
  reloadToken?: number;
}) {
  const [data, setData] = useState<AnswerSheetCorrectionsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localReload, setLocalReload] = useState(0);
  const [loadedFor, setLoadedFor] = useState(0);
  const scrolledFor = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listAnswerSheetCorrections(writtenTestId, { signal: controller.signal })
      .then((list) => {
        if (controller.signal.aborted) return;
        setData(list);
        setLoadedFor(reloadToken);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(normalizeApiError(err, "Não foi possível carregar as correções gravadas.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [writtenTestId, reloadToken, localReload]);

  useEffect(() => {
    if (reloadToken < 1 || loadedFor !== reloadToken || scrolledFor.current === reloadToken) return;
    scrolledFor.current = reloadToken;
    document.getElementById("correcoes-gravadas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reloadToken, loadedFor]);

  const hasStudents = (data?.students.length ?? 0) > 0;
  if (!hasStudents && !error && reloadToken === 0) return null;

  return (
    <div id="correcoes-gravadas" className="scroll-mt-24">
      <SectionCard
        title="Correções gravadas"
        description="O que já foi salvo desta avaliação, em ordem de nome. A nota das objetivas vai de 0 a 16. O ditado vai de 0 a 4 e o bilhete de 0 a 14."
        icon={ClipboardCheck}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setLocalReload((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      >
        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" onClick={() => setLocalReload((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? <p className="text-xs text-muted-foreground">Atualizando as correções…</p> : null}
            <AnswerSheetSavedResultList students={data?.students ?? []} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function AnswerSheetSavedResultList({ students }: { students: AnswerSheetSavedStudent[] }) {
  if (!students.length) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma correção gravada nesta avaliação.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{students.length} aluno(s) com correção gravada.</p>
      <ul className="space-y-2">
        {students.map((student, index) => (
          <SavedStudent key={`${student.correctionId ?? student.studentId ?? "aluno"}-${index}`} student={student} />
        ))}
      </ul>
    </div>
  );
}

function SavedStudent({ student }: { student: AnswerSheetSavedStudent }) {
  const name = student.studentName?.trim() || "Aluno sem nome";
  const writing = student.writing;
  const objective = student.objective;

  return (
    <li className="rounded-xl border">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{name}</p>
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>
              <span className="text-muted-foreground">Objetivas </span>
              <span className="font-medium tabular-nums">
                {objective ? scoreText(objective.points, objective.maxPoints) : "sem cartão"}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Ditado </span>
              <span className="font-medium tabular-nums">
                {writing ? scoreText(writing.wordPoints, WORD_MAX) : "sem correção"}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Bilhete </span>
              <span className="font-medium tabular-nums">
                {writing ? scoreText(writing.textPoints, TEXT_MAX) : "sem correção"}
              </span>
            </span>
            {writing ? <StatusBadge kind="writing" status={writing.status} /> : null}
            {writing?.source ? <Badge variant="outline">{knownLabel(SOURCE, writing.source)}</Badge> : null}
          </div>
        </summary>
        <div className="space-y-5 border-t p-3">
          <ObjectiveBlock objective={objective} pages={student.pages} crops={student.crops} />
          <WritingBlock writing={writing} />
        </div>
      </details>
    </li>
  );
}

function SheetMeta({ pages, crops }: { pages: number[]; crops: AnswerSheetSavedStudent["crops"] }) {
  if (!pages.length && !crops.length) return null;
  return (
    <>
      {pages.length ? <p className="text-xs text-muted-foreground">Folhas gravadas: {pages.join(", ")}</p> : null}
      {crops.length ? (
        <p className="text-xs text-muted-foreground">
          Imagens: {byNumber(crops).map((crop) => cropSavedLabel(crop.number, crop.saved)).join(" · ")}
        </p>
      ) : null}
    </>
  );
}

function StatusBadge({ kind, status }: { kind: "objective" | "writing"; status: string }) {
  const map = kind === "objective" ? OBJECTIVE_STATUS : WRITING_STATUS;
  const known = map[status];
  return <Badge variant={known?.variant ?? "outline"}>{known?.label ?? knownLabel({}, status)}</Badge>;
}

function cropSavedLabel(number: number, saved: boolean) {
  const name = number === 19 ? "Bilhete" : number === 17 || number === 18 ? `Ditado ${number}` : `Questão ${number}`;
  return `${name} ${saved ? "salvo" : "não enviado"}`;
}

function ObjectiveBlock({
  objective,
  pages,
  crops,
}: {
  objective: AnswerSheetSavedStudent["objective"];
  pages: number[];
  crops: AnswerSheetSavedStudent["crops"];
}) {
  if (!objective) {
    return (
      <section className="space-y-1">
        <h4 className="text-sm font-medium">Objetivas</h4>
        <p className="text-sm text-muted-foreground">O cartão deste aluno ainda não foi lido.</p>
        <SheetMeta pages={pages} crops={crops} />
      </section>
    );
  }

  const items = byNumber(objective.items);
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-medium">Objetivas</h4>
        <p className="text-sm tabular-nums">
          {objective.points == null ? "Nota em aberto" : `${objective.points} de ${objective.maxPoints}`}
        </p>
      </div>
      {objective.points == null ? (
        <p className="text-xs text-muted-foreground">A nota fecha quando nenhuma objetiva estiver pendente.</p>
      ) : null}
      <SheetMeta pages={pages} crops={crops} />
      {items.length ? (
        <p className="text-xs text-muted-foreground">
          {(["CORRETA", "INCORRETA", "EM_BRANCO", "INVALIDA", "PENDENTE"] as const)
            .filter((status) => counts[status])
            .map((status) => objectiveCountLabel(status, counts[status]))
            .join(" · ")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma objetiva neste registro.</p>
      )}
      {items.length ? (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {items.map((item) => (
            <ObjectiveItem key={`${item.number}-${item.questionId}`} item={item} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ObjectiveItem({ item }: { item: AnswerSheetObjectiveItem }) {
  return (
    <li className="rounded-md border px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium tabular-nums">{item.number}</span>
        <StatusBadge kind="objective" status={item.status} />
      </div>
      <p className="mt-1 text-muted-foreground">
        Marca {item.letter ?? "—"} · Gabarito {item.answerKey ?? "—"}
      </p>
    </li>
  );
}

function WritingBlock({ writing }: { writing: AnswerSheetWritingScore | null }) {
  if (!writing) {
    return (
      <section>
        <h4 className="text-sm font-medium">Ditado e bilhete</h4>
        <p className="mt-1 text-sm text-muted-foreground">A escrita deste aluno ainda não foi corrigida.</p>
      </section>
    );
  }

  const words = byNumber(writing.words);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium">Ditado e bilhete</h4>
        <StatusBadge kind="writing" status={writing.status} />
        {writing.source ? <Badge variant="outline">{knownLabel(SOURCE, writing.source)}</Badge> : null}
      </div>
      {writing.status === "ERRO" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {writing.message?.trim() || "A correção da escrita falhou e a nota não fechou."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-4 text-sm">
        <p>
          <span className="text-muted-foreground">Ditado </span>
          <span className="font-medium tabular-nums">{scoreText(writing.wordPoints, WORD_MAX)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Bilhete </span>
          <span className="font-medium tabular-nums">{scoreText(writing.textPoints, TEXT_MAX)}</span>
        </p>
      </div>
      {words.length ? (
        <ul className="space-y-2">
          {words.map((word) => (
            <WritingWord key={`${word.number}-${word.questionId}`} word={word} />
          ))}
        </ul>
      ) : null}
      {writing.production ? <ProductionBlock production={writing.production} /> : null}
      <FeedbackBlock feedback={writing.feedback} />
    </section>
  );
}

function WritingWord({ word }: { word: AnswerSheetWritingWord }) {
  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">Ditado {word.number}</p>
        {word.classification ? <Badge variant="outline">{knownLabel(CLASSIFICATION, word.classification)}</Badge> : null}
        {word.needsReview ? <Badge variant="warning">Revisar</Badge> : null}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {word.points == null ? "em aberto" : `${word.points} pt`}
        </span>
      </div>
      <p className="mt-2">
        <span className="text-muted-foreground">Esperado: </span>
        {word.expected || "—"}
      </p>
      <p>
        <span className="text-muted-foreground">Lido: </span>
        {word.transcription || "—"}
      </p>
      {word.justification.trim() ? <p className="mt-1 text-muted-foreground">{word.justification}</p> : null}
      {word.confidence ? (
        <p className="mt-1 text-xs text-muted-foreground">Confiança {knownLabel(CONFIDENCE, word.confidence)}</p>
      ) : null}
    </li>
  );
}

function ProductionBlock({ production }: { production: AnswerSheetWritingProduction }) {
  const genre = production.genre === "BILHETE" ? "Bilhete" : production.genre || "Produção";
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{genre}</p>
        {production.needsReview ? <Badge variant="warning">Revisar</Badge> : null}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {production.points == null ? "em aberto" : `${production.points}/${TEXT_MAX}`}
        </span>
      </div>
      {production.transcription.trim() ? (
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{production.transcription}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Sem transcrição.</p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {CRITERIA.map(([key, label]) => {
          const score = production.criteria[key];
          const why = production.justifications[key]?.trim();
          return (
            <li key={key} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className="font-medium tabular-nums">{typeof score === "number" ? score : "—"}</span>
              </div>
              {why ? <p className="mt-1 text-xs text-muted-foreground">{why}</p> : null}
            </li>
          );
        })}
      </ul>
      {production.confidence ? (
        <p className="text-xs text-muted-foreground">Confiança {knownLabel(CONFIDENCE, production.confidence)}</p>
      ) : null}
    </div>
  );
}

function FeedbackBlock({ feedback }: { feedback: AnswerSheetWritingScore["feedback"] }) {
  const notes = feedback.notes.trim();
  const hasLists = feedback.demonstrated.length || feedback.difficulties.length || feedback.interventions.length;
  if (!hasLists && !notes) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Devolutiva</h4>
      <FeedbackList title="O que demonstrou" items={feedback.demonstrated} />
      <FeedbackList title="Dificuldades" items={feedback.difficulties} />
      <FeedbackList title="Intervenções" items={feedback.interventions} />
      {notes ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Observação: </span>
          {notes}
        </p>
      ) : null}
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
