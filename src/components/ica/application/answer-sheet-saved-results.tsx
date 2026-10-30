"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCropObjectUrl,
  listAnswerSheetCorrections,
  releaseWriting,
  reviewWriting,
} from "@/lib/api/afirme-reading/written-tests";
import type {
  AnswerSheetCorrectionsList,
  AnswerSheetCrop,
  AnswerSheetObjectiveItem,
  AnswerSheetSavedStudent,
  AnswerSheetWritingProduction,
  AnswerSheetWritingReading,
  AnswerSheetWritingScore,
  AnswerSheetWritingWord,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/ica/written-tests";
import { canReleaseWriting, criterionScore, WRITING_CRITERIA } from "@/lib/ica/writing";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

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

const STIMULUS: Record<string, string> = {
  IMAGEM: "Figura",
  PALAVRA: "Palavra falada",
  image: "Figura",
  word: "Palavra falada",
};

const SITUATION: Record<string, string> = {
  legivel: "legível",
  ilegivel: "ilegível",
  duvidosa: "duvidosa",
  em_branco: "em branco",
  branco: "em branco",
};

const AUDIT_ACTION: Record<string, string> = {
  leitura: "Leitura",
  revisao: "Conferência",
  liberacao: "Liberação",
};

const AUDIT_DECISION: Record<string, string> = {
  transcricao_conferida: "Transcrição conferida",
  liberada: "Liberada",
  lancamento_manual: "Lançamento manual",
};

const ITEM_STATUS: Record<string, { label: string; variant: "success" | "warning" | "outline" }> = {
  CORRIGIDA: { label: "Com nota", variant: "success" },
  PENDENTE: { label: "Pendente", variant: "warning" },
};

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
        description="O que já foi salvo desta avaliação, em ordem de nome. A nota das objetivas vai de 0 a 16. O ditado vai de 0 a 4 e o bilhete de 0 a 14. A nota da escrita só publica depois da conferência."
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
            <AnswerSheetSavedResultList
              students={data?.students ?? []}
              writtenTestId={writtenTestId}
              onUpdated={() => setLocalReload((value) => value + 1)}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function AnswerSheetSavedResultList({
  students,
  writtenTestId,
  onUpdated,
}: {
  students: AnswerSheetSavedStudent[];
  writtenTestId?: string;
  onUpdated?: () => void;
}) {
  if (!students.length) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma correção gravada nesta avaliação.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{students.length} aluno(s) com correção gravada.</p>
      <ul className="space-y-2">
        {students.map((student, index) => (
          <SavedStudent
            key={`${student.correctionId ?? student.studentId ?? "aluno"}-${index}`}
            student={student}
            writtenTestId={writtenTestId}
            onUpdated={onUpdated}
          />
        ))}
      </ul>
    </div>
  );
}

function SavedStudent({
  student,
  writtenTestId,
  onUpdated,
}: {
  student: AnswerSheetSavedStudent;
  writtenTestId?: string;
  onUpdated?: () => void;
}) {
  const name = student.studentName?.trim() || "Aluno sem nome";
  const writing = student.writing;
  const objective = student.objective;
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-xl border">
      <details className="group" onToggle={(event) => setOpen(event.currentTarget.open)}>
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
            {writing ? (
              <Badge variant={writing.published ? "success" : "outline"}>
                {writing.published ? "Liberada" : "Não publicada"}
              </Badge>
            ) : null}
            {writing?.source ? <Badge variant="outline">{knownLabel(SOURCE, writing.source)}</Badge> : null}
          </div>
        </summary>
        {open ? (
          <div className="space-y-5 border-t p-3">
            <ObjectiveBlock objective={objective} pages={student.pages} crops={student.crops} />
            <WritingBlock
              writing={writing}
              crops={student.crops}
              studentId={student.studentId}
              writtenTestId={writtenTestId}
              onUpdated={onUpdated}
            />
          </div>
        ) : null}
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

function WritingBlock({
  writing,
  crops,
  studentId,
  writtenTestId,
  onUpdated,
}: {
  writing: AnswerSheetWritingScore | null;
  crops: AnswerSheetCrop[];
  studentId: string | null;
  writtenTestId?: string;
  onUpdated?: () => void;
}) {
  const [releasing, setReleasing] = useState(false);
  if (!writing) {
    return (
      <section>
        <h4 className="text-sm font-medium">Ditado e bilhete</h4>
        <p className="mt-1 text-sm text-muted-foreground">A escrita deste aluno ainda não foi corrigida.</p>
      </section>
    );
  }

  const words = byNumber(writing.words);
  const ready = canReleaseWriting(writing);
  const canAct = Boolean(writtenTestId && studentId && onUpdated);

  async function release() {
    if (!writtenTestId || !studentId || releasing) return;
    setReleasing(true);
    try {
      await releaseWriting(writtenTestId, { studentId });
      toast.success("Nota liberada.");
      onUpdated?.();
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível liberar a nota.").message);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium">Ditado e bilhete</h4>
        <StatusBadge kind="writing" status={writing.status} />
        {writing.source ? <Badge variant="outline">{knownLabel(SOURCE, writing.source)}</Badge> : null}
        <Badge variant={writing.published ? "success" : "outline"}>{writing.published ? "Liberada" : "Não publicada"}</Badge>
      </div>
      {writing.review ? (
        <p className="text-xs text-muted-foreground">
          {knownLabel(AUDIT_DECISION, writing.review.decision ?? "") || "Registro"}
          {formatDateTime(writing.review.reviewedAt) ? ` · ${formatDateTime(writing.review.reviewedAt)}` : ""}
        </p>
      ) : null}
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
            <WritingWord
              key={`${word.number}-${word.questionId}`}
              word={word}
              crop={crops.find((item) => item.number === word.number)}
              studentId={studentId}
              writtenTestId={writtenTestId}
              published={writing.published}
              onUpdated={onUpdated}
            />
          ))}
        </ul>
      ) : null}
      {writing.production ? (
        <ProductionBlock
          production={writing.production}
          crop={crops.find((item) => item.number === writing.production?.number)}
          studentId={studentId}
          writtenTestId={writtenTestId}
          published={writing.published}
          onUpdated={onUpdated}
        />
      ) : null}
      {canAct && !writing.published ? (
        <div className="space-y-2">
          <Button type="button" onClick={() => void release()} disabled={!ready || releasing}>
            {releasing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Liberar nota
          </Button>
          {!ready ? (
            <p className="text-xs text-muted-foreground">
              Confira a transcrição dos itens sem nota antes de liberar. Enquanto houver pendência, a nota continua sem publicar.
            </p>
          ) : null}
        </div>
      ) : null}
      <FeedbackBlock feedback={writing.feedback} />
      <AuditTrail writing={writing} />
    </section>
  );
}

function WritingWord({
  word,
  crop,
  studentId,
  writtenTestId,
  published,
  onUpdated,
}: {
  word: AnswerSheetWritingWord;
  crop?: AnswerSheetCrop;
  studentId: string | null;
  writtenTestId?: string;
  published: boolean;
  onUpdated?: () => void;
}) {
  const stimulus = knownLabel(STIMULUS, word.stimulus);
  const pending = !published && (word.points == null || word.status === "PENDENTE" || word.needsReview);
  const sameAsReadings =
    word.readings.length > 0 && word.readings.every((reading) => reading.transcription === word.transcription);
  return (
    <li className="space-y-3 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          Ditado {word.number}
          {stimulus ? <span className="font-normal text-muted-foreground"> · {stimulus}</span> : null}
        </p>
        {word.status ? <ItemStatus status={word.status} /> : null}
        {word.classification ? <Badge variant="outline">{knownLabel(CLASSIFICATION, word.classification)}</Badge> : null}
        {word.needsReview ? <Badge variant="warning">Revisar</Badge> : null}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {word.points == null ? "em aberto" : `${word.points}/2`}
        </span>
      </div>
      <CropPhoto imageUrl={crop?.imageUrl} label={`Letra da questão ${word.number}`} />
      {word.expected ? (
        <p>
          <span className="text-muted-foreground">Esperado: </span>
          {word.expected}
        </p>
      ) : null}
      <Readings readings={word.readings} transcription={word.transcription} secondTranscription={word.secondTranscription} />
      {word.points != null && !sameAsReadings ? (
        <p>
          <span className="text-muted-foreground">Texto da nota: </span>
          {word.transcription.trim() ? word.transcription : "(em branco)"}
        </p>
      ) : null}
      {word.justification.trim() ? <p className="text-muted-foreground">{word.justification}</p> : null}
      {pending && writtenTestId && studentId && onUpdated ? (
        <TranscriptionConfirm
          id={`revisao-${studentId}-${word.number}`}
          initial={word.transcription}
          multiline={false}
          onConfirm={async (transcription) => {
            await reviewWriting(writtenTestId, { studentId, words: [{ number: word.number, transcription }] });
            onUpdated();
          }}
        />
      ) : null}
    </li>
  );
}

function ProductionBlock({
  production,
  crop,
  studentId,
  writtenTestId,
  published,
  onUpdated,
}: {
  production: AnswerSheetWritingProduction;
  crop?: AnswerSheetCrop;
  studentId: string | null;
  writtenTestId?: string;
  published: boolean;
  onUpdated?: () => void;
}) {
  const genre = production.genre === "BILHETE" ? "Bilhete" : production.genre || "Produção";
  const pending = !published && (production.points == null || production.status === "PENDENTE" || production.needsReview);
  const sameAsReadings =
    production.readings.length > 0 &&
    production.readings.every((reading) => reading.transcription === production.transcription);
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{genre}</p>
        {production.status ? <ItemStatus status={production.status} /> : null}
        {production.needsReview ? <Badge variant="warning">Revisar</Badge> : null}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {production.points == null ? "em aberto" : `${production.points}/${TEXT_MAX}`}
        </span>
      </div>
      <CropPhoto imageUrl={crop?.imageUrl} label="Letra do bilhete" />
      <Readings
        readings={production.readings}
        transcription={production.transcription}
        secondTranscription={production.secondTranscription}
      />
      {production.points != null && !sameAsReadings ? (
        <p className="whitespace-pre-wrap text-sm">
          <span className="text-muted-foreground">Texto da nota: </span>
          {production.transcription.trim() ? production.transcription : "(em branco)"}
        </p>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {WRITING_CRITERIA.map((criterion) => {
          const score = criterionScore(production.criteria, criterion.readKeys);
          const why = criterion.readKeys.map((key) => production.justifications[key]?.trim()).find(Boolean);
          return (
            <li key={criterion.postKey} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{criterion.label}</span>
                <span className="font-medium tabular-nums">{typeof score === "number" ? score : "—"}</span>
              </div>
              {why ? <p className="mt-1 text-xs text-muted-foreground">{why}</p> : null}
            </li>
          );
        })}
      </ul>
      {pending && writtenTestId && studentId && onUpdated ? (
        <TranscriptionConfirm
          id={`revisao-${studentId}-bilhete`}
          initial={production.transcription}
          multiline
          onConfirm={async (transcription) => {
            await reviewWriting(writtenTestId, { studentId, production: { transcription } });
            onUpdated();
          }}
        />
      ) : null}
    </div>
  );
}

function ItemStatus({ status }: { status: string }) {
  const known = ITEM_STATUS[status];
  return <Badge variant={known?.variant ?? "outline"}>{known?.label ?? knownLabel({}, status)}</Badge>;
}

function Readings({
  readings,
  transcription,
  secondTranscription,
}: {
  readings: AnswerSheetWritingReading[];
  transcription: string;
  secondTranscription: string;
}) {
  if (!readings.length) {
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-wrap">
          <span className="text-muted-foreground">Transcrição: </span>
          {transcription.trim() ? transcription : "—"}
        </p>
        {secondTranscription.trim() && secondTranscription !== transcription ? (
          <p className="whitespace-pre-wrap">
            <span className="text-muted-foreground">Segunda leitura: </span>
            {secondTranscription}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {readings.map((reading, index) => (
        <li key={`${reading.model}-${index}`} className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Leitura {index + 1}
            {reading.model ? ` · ${reading.model}` : ""}
            {reading.situation ? ` · ${knownLabel(SITUATION, reading.situation)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{reading.transcription.trim() ? reading.transcription : "(em branco)"}</p>
          {reading.uncertain.length ? (
            <p className="mt-1 text-xs text-muted-foreground">Trechos incertos: {reading.uncertain.join(", ")}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CropPhoto({ imageUrl, label }: { imageUrl?: string | null; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setSrc(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);
    fetchCropObjectUrl(imageUrl)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  if (!imageUrl) return <p className="text-xs text-muted-foreground">A foto deste recorte não foi salva.</p>;
  if (failed) return <p className="text-xs text-muted-foreground">Não foi possível abrir a foto da letra.</p>;
  if (!src) return <Skeleton className="h-28 w-full max-w-sm rounded-lg" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG autenticado, carregado como blob
    <img src={src} alt={label} className="max-h-48 max-w-full rounded-lg border bg-white object-contain" />
  );
}

function TranscriptionConfirm({
  id,
  initial,
  multiline,
  onConfirm,
}: {
  id: string;
  initial: string;
  multiline: boolean;
  onConfirm: (transcription: string) => Promise<void>;
}) {
  const [text, setText] = useState(initial);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setText(initial);
  }, [initial]);

  async function confirm() {
    if (sending) return;
    setSending(true);
    try {
      await onConfirm(text.trim());
      toast.success("Transcrição conferida. A nota deste item foi recalculada.");
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível conferir a transcrição.").message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Texto que está na folha</Label>
      <Textarea
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={multiline ? "min-h-[96px] whitespace-pre-wrap" : "min-h-[72px]"}
        disabled={sending}
      />
      <p className="text-xs text-muted-foreground">Deixe vazio se a resposta estiver em branco. A nota deste item é recalculada e continua sem publicar.</p>
      <Button type="button" variant="outline" size="sm" onClick={() => void confirm()} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Confirmar transcrição
      </Button>
    </div>
  );
}

function AuditTrail({ writing }: { writing: AnswerSheetWritingScore }) {
  if (!writing.audit.length) return null;
  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Trilha da correção ({writing.audit.length})</summary>
      <ol className="space-y-3 border-t p-3">
        {writing.audit.map((entry, index) => (
          <li key={`${entry.at}-${entry.action}-${index}`} className="text-sm">
            <p className="font-medium">
              {knownLabel(AUDIT_ACTION, entry.action) || entry.action || "Registro"}
              {entry.decision ? <span className="font-normal text-muted-foreground"> · {knownLabel(AUDIT_DECISION, entry.decision)}</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(entry.at) ?? "Sem data"}
              {entry.actorId ? ` · ${entry.actorId}` : ""}
            </p>
            {entry.promptVersions ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.promptVersions.leitura ? `Leitura ${entry.promptVersions.leitura}` : ""}
                {entry.promptVersions.leitura && entry.promptVersions.avaliacao ? " · " : ""}
                {entry.promptVersions.avaliacao ? `Avaliação ${entry.promptVersions.avaliacao}` : ""}
              </p>
            ) : null}
            {entry.items.length ? (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {entry.items.map((item) => {
                  const transcription = asTrailText(item.transcription);
                  const status = asTrailText(item.status);
                  const evidence = asTrailText(item.evidence);
                  return (
                    <li key={`${entry.at}-${item.number}`}>
                      Questão {item.number}: {transcription || "(em branco)"}
                      {item.points == null ? "" : ` · ${item.points} pt`}
                      {status ? ` · ${knownLabel(ITEM_STATUS_LABEL, status)}` : ""}
                      {evidence ? ` · ${evidence}` : ""}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

function asTrailText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  CORRIGIDA: "com nota",
  PENDENTE: "pendente",
};

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
