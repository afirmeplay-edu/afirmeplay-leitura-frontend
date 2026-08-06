"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import {
  createGuidedSession,
  getReadingText,
  uploadGuidedSessionAudio,
  type GuidedSession,
  type ReadingQuestion,
  type ReadingText,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { GuidedSelection } from "@/components/leitura-guiada/guided-selection-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5;

const PROSODY_OPTIONS = [
  { value: 1, label: "1 — Inadequada" },
  { value: 2, label: "2 — Limitada" },
  { value: 3, label: "3 — Adequada" },
  { value: 4, label: "4 — Boa" },
  { value: 5, label: "5 — Excelente" },
];

function tokenizeWords(content: string) {
  return content.split(/\s+/).filter(Boolean);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface GuidedSessionFlowProps {
  selection: GuidedSelection;
  onRestart: () => void;
}

export function GuidedSessionFlow({ selection, onRestart }: GuidedSessionFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [text, setText] = useState<ReadingText | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [loadingText, setLoadingText] = useState(true);

  const [readingTime, setReadingTime] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);

  const [selectedWordIndexes, setSelectedWordIndexes] = useState<number[]>([]);
  const [prosodyLevel, setProsodyLevel] = useState(3);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GuidedSession | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const words = useMemo(() => (text ? tokenizeWords(text.content) : []), [text]);
  const wordsRead = words.length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingText(true);
      try {
        const full = await getReadingText(selection.text.id);
        if (cancelled) return;
        setText(full);
        setQuestions(full.questions ?? []);
        const initial: Record<string, number | null> = {};
        (full.questions ?? []).forEach((q) => {
          initial[q.id] = null;
        });
        setAnswers(initial);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Nao foi possivel carregar o texto."));
      } finally {
        if (!cancelled) setLoadingText(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selection.text.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
    };
  }, [localAudioUrl]);

  async function startReading() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setLocalAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      startedAtRef.current = Date.now();
      setReadingTime(0);
      timerRef.current = setInterval(() => {
        setReadingTime(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);

      setIsReading(true);
      setStep(2);
    } catch {
      toast.error("Nao foi possivel acessar o microfone. Verifique a permissao do navegador.");
    }
  }

  function stopReading() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    setReadingTime(elapsed);

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsReading(false);
    setStep(3);
  }

  function toggleWord(index: number) {
    setSelectedWordIndexes((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  }

  async function handleSubmit() {
    if (!text) return;

    if (!audioBlob) {
      toast.error("Grave o audio da leitura antes de enviar.");
      return;
    }

    const unanswered = questions.filter((q) => answers[q.id] === null || answers[q.id] === undefined);
    if (questions.length > 0 && unanswered.length > 0) {
      toast.error("Responda todas as perguntas de compreensao.");
      return;
    }

    const errorsCount = selectedWordIndexes.length;
    if (errorsCount > wordsRead) {
      toast.error("Quantidade de erros nao pode ser maior que as palavras lidas.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await createGuidedSession({
        studentId: selection.student.id,
        readingTextId: text.id,
        wordsRead,
        readingTimeSeconds: readingTime,
        errorsCount,
        prosodyLevel,
        answers: questions.map((q) => ({
          readingTextQuestionId: q.id,
          selectedOption: answers[q.id] as number,
        })),
      });

      let withAudio = session;
      try {
        withAudio = await uploadGuidedSessionAudio(session.id, audioBlob, "leitura.webm");
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            "Sessao salva, mas o upload do audio falhou. Tente novamente depois."
          )
        );
      }

      setResult(withAudio);
      setStep(5);
      toast.success("Leitura guiada registrada com sucesso.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Falha ao salvar a sessao."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingText) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-white p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando texto e perguntas...
      </div>
    );
  }

  if (!text) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <p className="text-sm text-red-600">Texto nao encontrado.</p>
        <Button className="mt-4" variant="outline" onClick={onRestart}>
          Voltar a selecao
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-bluebrand-deep">{text.title}</h2>
            <p className="text-sm text-muted-foreground">
              {selection.student.name} · {selection.schoolClass.name} · {selection.school.name}
            </p>
          </div>
          <Button variant="outline" onClick={onRestart} disabled={isReading || submitting}>
            Nova selecao
          </Button>
        </div>

        <ol className="mt-4 flex flex-wrap gap-2 text-xs">
          {[
            { id: 1, label: "Preparacao" },
            { id: 2, label: "Leitura" },
            { id: 3, label: "Correcao" },
            { id: 4, label: "Compreensao" },
            { id: 5, label: "Resultado" },
          ].map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-full px-3 py-1",
                step === item.id
                  ? "bg-bluebrand-deep text-white"
                  : step > item.id
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-500"
              )}
            >
              {item.id}. {item.label}
            </li>
          ))}
        </ol>
      </div>

      {step === 1 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-bluebrand-deep">Preparacao</h3>
          <p className="text-sm text-muted-foreground">
            O aluno lera o texto em voz alta. O microfone sera solicitado ao iniciar. O professor
            corrige os erros ouvindo a gravacao.
          </p>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {text.content}
          </div>
          <p className="text-xs text-muted-foreground">{wordsRead} palavras no texto</p>
          <Button onClick={() => void startReading()} className="bg-bluebrand-deep text-white">
            <Mic className="h-4 w-4" />
            Iniciar leitura
          </Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-bluebrand-deep">Leitura em andamento</h3>
            <span className="font-mono text-2xl font-bold text-bluebrand-deep">
              {formatTime(readingTime)}
            </span>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4 text-base leading-relaxed text-slate-800 whitespace-pre-wrap">
            {text.content}
          </div>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
            Gravando audio...
          </div>
          <Button onClick={stopReading} className="bg-red-600 text-white hover:bg-red-700">
            <Square className="h-4 w-4" />
            Finalizar leitura
          </Button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-bluebrand-deep">Correcao do professor</h3>
          <p className="text-sm text-muted-foreground">
            Ouça a gravacao e clique nas palavras lidas incorretamente.
          </p>

          {localAudioUrl ? (
            <audio controls src={localAudioUrl} className="w-full" />
          ) : (
            <p className="text-sm text-amber-700">Processando audio...</p>
          )}

          <div className="rounded-lg border bg-slate-50 p-4 leading-8">
            {words.map((word, index) => {
              const selected = selectedWordIndexes.includes(index);
              return (
                <button
                  key={`${word}-${index}`}
                  type="button"
                  onClick={() => toggleWord(index)}
                  className={cn(
                    "mr-1 inline rounded px-0.5 transition",
                    selected ? "bg-red-200 text-red-900 line-through" : "hover:bg-blue-100"
                  )}
                >
                  {word}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Erros marcados</p>
              <p className="text-2xl font-bold text-bluebrand-deep">{selectedWordIndexes.length}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Tempo de leitura</p>
              <p className="text-2xl font-bold text-bluebrand-deep">{formatTime(readingTime)}</p>
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            <Label>Prosodia (1–5)</Label>
            <Select
              value={String(prosodyLevel)}
              onValueChange={(value) => setProsodyLevel(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROSODY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setStep(4)}
            disabled={!localAudioUrl}
            className="bg-bluebrand-deep text-white"
          >
            Continuar para compreensao
          </Button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-bluebrand-deep">Compreensao</h3>

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este texto nao possui perguntas cadastradas. Voce pode enviar a sessao mesmo assim.
            </p>
          ) : (
            <div className="space-y-5">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-lg border p-4">
                  <p className="font-medium text-bluebrand-deep">
                    {index + 1}. {question.statement}
                  </p>
                  <div className="mt-3 space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <label
                        key={`${question.id}-${optionIndex}`}
                        className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-slate-50"
                      >
                        <input
                          type="radio"
                          name={`q-${question.id}`}
                          className="mt-1"
                          checked={answers[question.id] === optionIndex}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(3)} disabled={submitting}>
              Voltar
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || !audioBlob}
              className="bg-bluebrand-deep text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Finalizar e enviar"
              )}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 5 && result ? (
        <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-bluebrand-deep">Resultado</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="PLCM" value={result.calculatedPlcm ?? "—"} />
            <Metric
              label="Precisao"
              value={
                result.calculatedAccuracy != null ? `${result.calculatedAccuracy}%` : "—"
              }
            />
            <Metric label="Erros" value={result.errorsCount} />
            <Metric label="Prosodia" value={result.prosodyLevel} />
            <Metric
              label="Compreensao"
              value={
                result.comprehensionScore != null ? `${result.comprehensionScore}%` : "—"
              }
            />
            <Metric
              label="Audio"
              value={result.hasAudio ? "Enviado" : "Nao enviado"}
            />
          </div>

          {localAudioUrl ? <audio controls src={localAudioUrl} className="w-full" /> : null}

          <Button onClick={onRestart} className="bg-bluebrand-deep text-white">
            Nova leitura guiada
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-bluebrand-deep">{value}</p>
    </div>
  );
}
