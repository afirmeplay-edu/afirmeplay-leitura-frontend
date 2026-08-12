"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import type {
  FluencyListPartPayload,
  FluencyMarkingSource,
  FluencyNotReadReason,
  FluencyWordStatus,
} from "@/lib/api/afirme-reading";
import {
  computeRms,
  getSpeechRecognitionCtor,
  hypothesisMatchesExpected,
  pickRecorderMimeType,
  voiceThresholdFromNoiseFloor,
  type SpeechRecognitionLike,
} from "@/components/fluencia/fluency-browser-utils";
import {
  NOT_READ_REASON_OPTIONS,
  type NotReadReasonValue,
} from "@/components/fluencia/not-read-reasons";
import { createSttLog, SpeechTestCard } from "@/components/fluencia/speech-test-card";
import { ReadingCursorStage } from "@/components/fluencia/reading-cursor-stage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type WordStatus = FluencyWordStatus;

export const WORD_STATUS_OPTIONS: ReadonlyArray<{
  id: WordStatus;
  label: string;
  shortLabel: string;
}> = [
  { id: "nao_leu", label: "Não leu", shortLabel: "Não leu" },
  { id: "acertou", label: "Acertou", shortLabel: "Acertou" },
  { id: "inventou", label: "Inventou/Nomeou letras", shortLabel: "Inventou" },
  { id: "soletrou", label: "Soletrou/Silabou", shortLabel: "Soletrou" },
  { id: "errou", label: "Errou", shortLabel: "Errou" },
];

/** Statuses que entram em errorsCount (não-acerto). */
export const ERROR_STATUSES: readonly WordStatus[] = [
  "nao_leu",
  "errou",
  "inventou",
  "soletrou",
];

const SILENCE_MS = 3000;
/** Fallback até calibrar o piso de ruído nos primeiros frames. */
const RMS_SPEECH_THRESHOLD_FALLBACK = 0.04;
const NOISE_CALIBRATION_MS = 900;

export interface FluencyListPartResult extends FluencyListPartPayload {
  audioBlob: Blob | null;
}

interface WordListFluencyStepProps {
  title: string;
  questionLabel?: string;
  words: string[];
  durationSeconds?: number;
  continuePending?: boolean;
  aiEnabledDefault?: boolean;
  onResultChange: (result: FluencyListPartResult | null) => void;
  onContinue: () => void;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function countByStatus(statuses: Array<WordStatus | null>, status: WordStatus) {
  return statuses.reduce((total, item) => (item === status ? total + 1 : total), 0);
}

function buildPayload(
  words: string[],
  statuses: Array<WordStatus | null>,
  sources: Array<FluencyMarkingSource | null>,
  readingTimeSeconds: number,
  transcript: string,
  skipped: boolean,
  notReadReason: FluencyNotReadReason | null,
  audioBlob: Blob | null,
  sttUsed: boolean
): FluencyListPartResult {
  let lastWordPosition = 0;
  for (let i = 0; i < statuses.length; i += 1) {
    if (statuses[i] != null) lastWordPosition = i + 1;
  }

  const markings = words.map((word, index) => ({
    index,
    word,
    status: statuses[index],
    source: sources[index] ?? undefined,
  }));

  const errorsCount = statuses.filter(
    (status) => status != null && ERROR_STATUSES.includes(status)
  ).length;

  return {
    wordsRead: lastWordPosition,
    lastWordPosition,
    errorsCount,
    readingTimeSeconds: Math.max(skipped ? 0 : 1, readingTimeSeconds),
    skipped,
    notReadReason,
    transcript: transcript.trim() || null,
    markings,
    sttProvider: sttUsed ? "web_speech_api" : undefined,
    audioBlob,
  };
}

function sttErrorMessage(code: string | undefined) {
  switch (code) {
    case "not-allowed":
      return "Permissão de reconhecimento de voz negada.";
    case "network":
      return "Web Speech precisa de internet. Continuando com mic + marcação manual.";
    case "service-not-allowed":
      return "Serviço de reconhecimento bloqueado neste navegador.";
    case "audio-capture":
      return "Falha ao capturar áudio para o reconhecimento.";
    case "no-speech":
      return null;
    default:
      return code ? `Web Speech: ${code}` : "Falha no reconhecimento de voz.";
  }
}

export function WordListFluencyStep({
  title,
  questionLabel = "QUESTÃO",
  words,
  durationSeconds = 60,
  continuePending = false,
  aiEnabledDefault = true,
  onResultChange,
  onContinue,
}: WordListFluencyStepProps) {
  const speechAvailable = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);
  const [aiActive, setAiActive] = useState(aiEnabledDefault && speechAvailable);
  const [statuses, setStatuses] = useState<Array<WordStatus | null>>(() =>
    words.map(() => null)
  );
  const [sources, setSources] = useState<Array<FluencyMarkingSource | null>>(() =>
    words.map(() => null)
  );
  const [cursor, setCursor] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<FluencyListPartResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const [motivo, setMotivo] = useState<NotReadReasonValue>("nao_se_aplica");
  const [micLevel, setMicLevel] = useState(0);
  const [hearingSpeech, setHearingSpeech] = useState(false);
  const [voiceThresholdUi, setVoiceThresholdUi] = useState(RMS_SPEECH_THRESHOLD_FALLBACK);
  const [sttStatus, setSttStatus] = useState<string>("");
  const [liveHeard, setLiveHeard] = useState("");
  const [sttLogs, setSttLogs] = useState<
    Array<{ id: number; at: string; level: "info" | "result" | "error"; message: string }>
  >([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const statusesRef = useRef(statuses);
  const sourcesRef = useRef(sources);
  const cursorRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedTimeRef = useRef<number | null>(null);
  const onResultChangeRef = useRef(onResultChange);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const transcriptRef = useRef("");
  const aiActiveRef = useRef(aiActive);
  const isRunningRef = useRef(false);
  const wordsRef = useRef(words);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const sttUsedRef = useRef(false);
  const advancingLockRef = useRef(false);
  const voiceThresholdRef = useRef(RMS_SPEECH_THRESHOLD_FALLBACK);
  const noiseSamplesRef = useRef<number[]>([]);
  const meterStartedAtRef = useRef(0);
  const lastSttActivityAtRef = useRef(0);

  const wordsKey = words.join("\u0001");

  onResultChangeRef.current = onResultChange;
  aiActiveRef.current = aiActive;
  wordsRef.current = words;

  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  function pushSttLog(level: "info" | "result" | "error", message: string) {
    const entry = createSttLog(level, message);
    setSttLogs((prev) => [entry, ...prev].slice(0, 50));
    if (level === "error") console.error("[WebSpeech]", message);
    else console.log("[WebSpeech]", message);
  }

  function stopMeter() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    silenceStartedAtRef.current = null;
    setMicLevel(0);
    setHearingSpeech(false);
  }

  function stopRecognition() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      /* ignore */
    }
  }

  function stopRecorder() {
    return new Promise<Blob | null>((resolve) => {
      stopMeter();
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve(audioBlobRef.current);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioBlobRef.current = blob.size > 0 ? blob : null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(audioBlobRef.current);
      };
      try {
        recorder.stop();
      } catch {
        resolve(audioBlobRef.current);
      }
    });
  }

  useEffect(() => {
    setStatuses(words.map(() => null));
    setSources(words.map(() => null));
    setCursor(0);
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
    isRunningRef.current = false;
    setIsFinished(false);
    setResult(null);
    setTranscript("");
    setMotivo("nao_se_aplica");
    sttUsedRef.current = false;
    setSttStatus("");
    setLiveHeard("");
    setSttLogs([]);
    finishedRef.current = false;
    lockedTimeRef.current = null;
    transcriptRef.current = "";
    audioBlobRef.current = null;
    chunksRef.current = [];
    onResultChangeRef.current(null);
    stopRecognition();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void stopRecorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, durationSeconds]);

  useEffect(() => {
    return () => {
      stopRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
      void stopRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      nao_leu: countByStatus(statuses, "nao_leu"),
      acertou: countByStatus(statuses, "acertou"),
      inventou: countByStatus(statuses, "inventou"),
      soletrou: countByStatus(statuses, "soletrou"),
      errou: countByStatus(statuses, "errou"),
    }),
    [statuses]
  );

  function elapsedSeconds() {
    if (!startedAtRef.current) return 1;
    return Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
  }

  async function finalize(
    nextStatuses: Array<WordStatus | null>,
    nextSources: Array<FluencyMarkingSource | null>,
    options?: { skipped?: boolean; reason?: FluencyNotReadReason | null }
  ) {
    stopRecognition();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const timeSeconds =
      options?.skipped && !startedAtRef.current
        ? 0
        : (lockedTimeRef.current ?? Math.min(durationSeconds, elapsedSeconds()));
    lockedTimeRef.current = timeSeconds;
    finishedRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    setIsFinished(true);
    setRemainingSeconds(Math.max(0, durationSeconds - timeSeconds));

    const blob = await stopRecorder();
    const skipped = Boolean(options?.skipped);
    const reason =
      options?.reason ??
      (motivo === "nao_se_aplica" ? null : (motivo as FluencyNotReadReason));

    const next = buildPayload(
      wordsRef.current,
      nextStatuses,
      nextSources,
      timeSeconds,
      transcriptRef.current,
      skipped,
      reason,
      blob,
      sttUsedRef.current || Boolean(transcriptRef.current)
    );
    setResult(next);
    onResultChangeRef.current(next);
  }

  function resetWordSilenceClock() {
    silenceStartedAtRef.current = Date.now();
    advancingLockRef.current = false;
  }

  function applyStatus(
    index: number,
    status: WordStatus,
    source: FluencyMarkingSource,
    advance: boolean
  ) {
    if (finishedRef.current) return;
    if (statusesRef.current[index] != null) {
      advancingLockRef.current = false;
      return;
    }

    // Trava imediata evita timeout RMS duplicado no mesmo frame/ciclo.
    const lockedStatuses = [...statusesRef.current];
    lockedStatuses[index] = status;
    statusesRef.current = lockedStatuses;

    setStatuses((prev) => {
      const nextStatuses = [...prev];
      nextStatuses[index] = status;
      const nextSources = [...sourcesRef.current];
      nextSources[index] = source;
      setSources(nextSources);
      sourcesRef.current = nextSources;
      statusesRef.current = nextStatuses;

      const nextCursor = advance ? index + 1 : index;
      if (advance) {
        setCursor(nextCursor);
        cursorRef.current = nextCursor;
        resetWordSilenceClock();
      } else {
        advancingLockRef.current = false;
      }

      const allDone = nextStatuses.every((item) => item != null);
      const pastEnd = advance && nextCursor >= wordsRef.current.length;

      queueMicrotask(() => {
        if (allDone || pastEnd) {
          void finalize(nextStatuses, nextSources);
        }
      });

      return nextStatuses;
    });
  }

  function handleAcousticSilenceTimeout() {
    if (finishedRef.current || !isRunningRef.current || advancingLockRef.current) return;
    const index = cursorRef.current;
    const list = wordsRef.current;
    if (index >= list.length) return;
    if (statusesRef.current[index] != null) return;

    // Inventou NÃO sai de RMS/ruído — só de hipótese final do STT sem match.
    advancingLockRef.current = true;
    pushSttLog(
      "info",
      `silêncio ${SILENCE_MS}ms (limiar voz=${voiceThresholdRef.current.toFixed(3)}) → Não leu`
    );
    applyStatus(index, "nao_leu", "timeout", true);
  }

  function startMeter(stream: MediaStream) {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    silenceStartedAtRef.current = Date.now();
    meterStartedAtRef.current = Date.now();
    noiseSamplesRef.current = [];
    voiceThresholdRef.current = RMS_SPEECH_THRESHOLD_FALLBACK;
    lastSttActivityAtRef.current = 0;

    const tick = () => {
      const current = analyserRef.current;
      if (!current || finishedRef.current || !isRunningRef.current) return;

      const rms = computeRms(current, data);
      setMicLevel(rms);

      const elapsedMeter = Date.now() - meterStartedAtRef.current;
      if (elapsedMeter < NOISE_CALIBRATION_MS) {
        noiseSamplesRef.current.push(rms);
        if (noiseSamplesRef.current.length >= 8) {
          const sorted = [...noiseSamplesRef.current].sort((a, b) => a - b);
          const floor = sorted[Math.floor(sorted.length * 0.2)] ?? sorted[0] ?? 0;
          const nextThreshold = voiceThresholdFromNoiseFloor(floor);
          voiceThresholdRef.current = nextThreshold;
          setVoiceThresholdUi(nextThreshold);
        }
      } else if (
        noiseSamplesRef.current.length > 0 &&
        elapsedMeter < NOISE_CALIBRATION_MS + 50
      ) {
        pushSttLog(
          "info",
          `piso calibrado → limiar voz=${voiceThresholdRef.current.toFixed(3)}`
        );
        noiseSamplesRef.current = [];
      }

      const voiceThreshold = voiceThresholdRef.current;
      // Só conta como "fala" volume acima do piso de ruído (ventilador não reseta o silêncio).
      const speaking = rms >= voiceThreshold;
      setHearingSpeech(speaking);

      if (speaking) {
        silenceStartedAtRef.current = null;
      } else {
        if (silenceStartedAtRef.current == null) {
          silenceStartedAtRef.current = Date.now();
        } else if (Date.now() - silenceStartedAtRef.current >= SILENCE_MS) {
          silenceStartedAtRef.current = null;
          handleAcousticSilenceTimeout();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    pushSttLog("info", "Medidor iniciado; calibrando piso de ruído…");
  }

  function handleSpeechTranscript(raw: string, isFinal: boolean) {
    const heard = raw.trim();
    if (!heard) return;

    if (isFinal) {
      transcriptRef.current = `${transcriptRef.current} ${heard}`.trim();
      setTranscript(transcriptRef.current);
      setLiveHeard("");
      pushSttLog("result", `FINAL: "${heard}"`);
    } else {
      setLiveHeard(heard);
      pushSttLog("result", `interim: "${heard}"`);
    }

    sttUsedRef.current = true;
    setSttStatus(isFinal ? "hipótese final" : "ouvindo…");
  }

  function evaluateRecognitionResult(
    alternatives: string[],
    isFinal: boolean
  ) {
    if (!aiActiveRef.current || finishedRef.current) return;

    const cleaned = alternatives.map((t) => t.trim()).filter(Boolean);
    if (cleaned.length === 0) return;

    handleSpeechTranscript(cleaned[0], isFinal);

    // Tenta match em todas as alternativas antes de decidir inventou.
    for (const text of cleaned) {
      const index = cursorRef.current;
      if (index >= wordsRef.current.length) return;
      if (statusesRef.current[index] != null) return;

      const expected = wordsRef.current[index];
      if (!expected) return;

      lastSttActivityAtRef.current = Date.now();
      silenceStartedAtRef.current = null;

      const match = hypothesisMatchesExpected(expected, text);
      if (match.matched) {
        pushSttLog(
          "info",
          `match ${match.kind} → esperado "${expected}" / ouviu "${match.token ?? text}"` +
            (match.distance != null ? ` (dist=${match.distance})` : "")
        );
        applyStatus(index, "acertou", "ia", true);
        return;
      }
    }

    if (isFinal) {
      const index = cursorRef.current;
      if (index >= wordsRef.current.length || statusesRef.current[index] != null) return;
      const expected = wordsRef.current[index];
      const heard = cleaned[0];
      pushSttLog(
        "info",
        `sem match em ${cleaned.length} alt(s) → inventou (esperado: "${expected}", ouviu: "${heard}")`
      );
      applyStatus(index, "inventou", "ia", true);
    }
  }

  function startRecognition() {
    if (!aiActiveRef.current) {
      setSttStatus("IA desligada — use marcação manual ou silêncio do mic");
      pushSttLog("info", "IA desligada; STT não iniciado.");
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.message("Web Speech indisponível neste navegador. Use marcação manual.");
      setAiActive(false);
      setSttStatus("Web Speech indisponível");
      pushSttLog("error", "SpeechRecognition indisponível neste navegador.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      if (!aiActiveRef.current || finishedRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const altCount = Math.max(1, result.length || 1);
        const alternatives: string[] = [];
        for (let a = 0; a < altCount; a += 1) {
          const text = result[a]?.transcript?.trim();
          if (text) {
            alternatives.push(text);
            if (a > 0) pushSttLog("result", `alt[${a}]: "${text}"`);
          }
        }
        evaluateRecognitionResult(alternatives, result.isFinal);
      }
    };
    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      pushSttLog("error", `onerror: ${code}`);
      if (code === "no-speech" || code === "aborted") {
        setSttStatus(code);
        return;
      }
      const message = sttErrorMessage(code);
      if (message) {
        setSttStatus(message);
        toast.message(message);
      }
      if (code === "not-allowed" || code === "service-not-allowed" || code === "network") {
        setAiActive(false);
        aiActiveRef.current = false;
        stopRecognition();
      }
    };
    recognition.onend = () => {
      pushSttLog("info", "onend");
      if (!finishedRef.current && aiActiveRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
          setSttStatus("reconhecimento reiniciado");
          pushSttLog("info", "reconhecimento reiniciado após onend");
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          setSttStatus("não foi possível reiniciar o STT");
          pushSttLog("error", `falha ao reiniciar: ${msg}`);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      sttUsedRef.current = true;
      setSttStatus("reconhecimento ativo");
      pushSttLog("info", "STT iniciado na lista (lang=pt-BR).");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.message("Não foi possível iniciar o reconhecimento de voz.");
      setAiActive(false);
      setSttStatus("falha ao iniciar STT");
      pushSttLog("error", `falha ao start(): ${msg}`);
    }
  }

  async function startTimer() {
    if (isRunning || isFinished || words.length === 0) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      audioBlobRef.current = null;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      startMeter(stream);
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique a permissão.");
      return;
    }

    startedAtRef.current = Date.now();
    lockedTimeRef.current = null;
    finishedRef.current = false;
    setRemainingSeconds(durationSeconds);
    setIsRunning(true);
    isRunningRef.current = true;
    setIsFinished(false);
    setResult(null);
    onResultChangeRef.current(null);
    setCursor(0);
    cursorRef.current = 0;
    resetWordSilenceClock();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        void finalize(statusesRef.current, sourcesRef.current);
      }
    }, 250);

    startRecognition();
  }

  function toggleWordStatus(index: number, status: WordStatus) {
    if (!isRunning && !isFinished) return;

    setStatuses((prev) => {
      const nextStatuses = [...prev];
      const clearing = prev[index] === status;
      nextStatuses[index] = clearing ? null : status;
      const nextSources = [...sourcesRef.current];
      nextSources[index] = clearing ? null : "manual";
      setSources(nextSources);
      sourcesRef.current = nextSources;
      statusesRef.current = nextStatuses;

      if (!clearing && index === cursorRef.current) {
        const nextCursor = index + 1;
        setCursor(nextCursor);
        cursorRef.current = nextCursor;
        resetWordSilenceClock();
      }

      const classified = nextStatuses.filter((item) => item != null).length;
      const shouldFinish = classified === words.length && words.length > 0;

      queueMicrotask(() => {
        if (finishedRef.current && !isFinished) {
          void finalize(nextStatuses, nextSources);
          return;
        }
        if (shouldFinish || isFinished) {
          void finalize(nextStatuses, nextSources);
        }
      });

      return nextStatuses;
    });
  }

  function handleSkip() {
    const reason =
      motivo === "nao_se_aplica" ? ("recusou" as FluencyNotReadReason) : (motivo as FluencyNotReadReason);
    if (motivo === "nao_se_aplica") {
      setMotivo("recusou");
    }
    void finalize(
      words.map(() => null),
      words.map(() => null),
      { skipped: true, reason }
    );
  }

  const cursorItems = useMemo(
    () =>
      words.map((word, index) => ({
        id: `${index}-${word}`,
        label: word,
        sequenceLabel: `${String(index + 1).padStart(2, "0")}.`,
        status: statuses[index] ?? null,
      })),
    [words, statuses]
  );

  if (words.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Nenhuma lista disponível. Cadastre em Configurar Avaliação.
        </p>
      </div>
    );
  }

  const canContinue = Boolean(result) && !continuePending;
  const lastWordInput = result?.lastWordPosition ?? statuses.filter((s) => s != null).length;
  const levelPercent = Math.min(100, Math.round(micLevel * 400));

  function jumpToWord(index: number) {
    if (!isRunning || finishedRef.current) return;
    if (index < 0 || index >= words.length) return;
    setCursor(index);
    cursorRef.current = index;
    resetWordSilenceClock();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-bluebrand-base">
          {questionLabel}
        </p>
        <h2 className="text-xl font-semibold text-bluebrand-deep">{title}</h2>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">IA — Correção automática por voz</p>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={aiActive}
              disabled={isRunning || !speechAvailable}
              onChange={(event) => setAiActive(event.target.checked)}
            />
            IA ativa
          </label>
        </div>
        <p className="mt-2 text-emerald-900/90">
          Compara o que o Web Speech ouviu com a <strong>palavra atual do cursor</strong> (match
          fonético/fuzzy: cenita≈senita). <strong>Inventou</strong> só quando o STT devolve uma
          hipótese final diferente. Ruído de fundo (ventilador) não conta como fala — o limiar se
          calibra nos primeiros segundos.
          {!speechAvailable ? " Web Speech indisponível — use marcação manual." : null}
        </p>
        {isRunning ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>
                {hearingSpeech
                  ? "Fala acima do limiar de voz"
                  : "Abaixo do limiar (ruído/silêncio)…"}{" "}
                · limiar {voiceThresholdUi.toFixed(3)}
              </span>
              <span className="text-emerald-800/80">{sttStatus || "—"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-75",
                  hearingSpeech ? "bg-emerald-600" : "bg-emerald-300"
                )}
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold text-amber-800">[APLICADOR] COMANDO PADRONIZADO</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Peça ao estudante para ler as palavras em voz alta, com calma.</li>
          <li>Informe que há 60 segundos para a lista.</li>
          <li>Se não souber uma palavra, aguarde alguns segundos e o sistema avançará.</li>
        </ul>
        <p className="mt-2 text-xs text-amber-800/80">
          Regra de transição: {SILENCE_MS / 1000}s abaixo do limiar de voz → &quot;Não leu&quot;.
          &quot;Inventou&quot; apenas se o reconhecimento entender outra palavra (ex.: comida →
          arroz).
        </p>
      </div>

      <SpeechTestCard
        disableStandaloneTest={isRunning}
        externalLiveText={isRunning ? liveHeard : undefined}
        externalLogs={isRunning || sttLogs.length > 0 ? sttLogs : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tempo restante</p>
          <span
            className={cn(
              "font-mono text-3xl font-bold tabular-nums",
              isRunning && remainingSeconds <= 10 ? "text-red-600" : "text-bluebrand-deep"
            )}
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isRunning && !isFinished ? (
            <Button onClick={() => void startTimer()} className="bg-emerald-600 hover:bg-emerald-700">
              <Mic className="h-4 w-4" />
              Iniciar gravação + cronômetro
            </Button>
          ) : null}
          {isRunning ? (
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Em andamento · palavra {Math.min(cursor + 1, words.length)}/{words.length}
            </span>
          ) : null}
          {isFinished ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Etapa pronta para concluir
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {WORD_STATUS_OPTIONS.map((option) => (
          <div key={option.id} className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">{option.shortLabel}</p>
            <p className="text-2xl font-bold text-bluebrand-deep">{counts[option.id]}</p>
          </div>
        ))}
      </div>

      <ReadingCursorStage
        mode="list"
        items={cursorItems}
        cursor={cursor}
        listening={isRunning && !isFinished}
        onSelectIndex={isRunning && !isFinished ? jumpToWord : undefined}
      />

      <div className="max-h-[50vh] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-12 bg-white">Nº</TableHead>
              <TableHead className="sticky top-0 z-10 w-[28%] bg-white">Palavra</TableHead>
              {WORD_STATUS_OPTIONS.map((option) => (
                <TableHead
                  key={option.id}
                  className="sticky top-0 z-10 bg-white px-2 text-center text-[11px] sm:text-xs"
                >
                  {option.shortLabel}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((word, index) => {
              const current = statuses[index];
              const isCurrent = isRunning && index === cursor;
              return (
                <TableRow
                  key={`${word}-${index}`}
                  className={cn(isCurrent && "bg-bluebrand-base/5")}
                >
                  <TableCell className="text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="font-semibold tracking-wide">{word}</TableCell>
                  {WORD_STATUS_OPTIONS.map((option) => {
                    const selected = current === option.id;
                    return (
                      <TableCell key={option.id} className="p-1 text-center">
                        <button
                          type="button"
                          disabled={!isRunning && !isFinished}
                          onClick={() => toggleWordStatus(index, option.id)}
                          className={cn(
                            "h-8 w-full rounded border text-xs transition",
                            selected
                              ? option.id === "acertou"
                                ? "border-emerald-600 bg-emerald-100 text-emerald-900"
                                : "border-red-500 bg-red-100 text-red-900"
                              : "border-transparent hover:bg-muted",
                            !isRunning && !isFinished && "cursor-not-allowed opacity-50"
                          )}
                          aria-label={`${option.label}: ${word}`}
                          aria-pressed={selected}
                        >
                          {selected ? "●" : "○"}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="last-word-pos">Posição da última palavra lida</Label>
          <input
            id="last-word-pos"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={lastWordInput}
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Calculado automaticamente pelo progresso da lista (máx. {words.length}).
          </p>
        </div>
        <div className="space-y-2">
          <Label>Motivo (caso o estudante não tenha lido)</Label>
          <Select
            value={motivo}
            onValueChange={(value) => setMotivo(value as NotReadReasonValue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOT_READ_REASON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {transcript ? (
        <p className="text-xs text-muted-foreground">
          Transcript (Web Speech): {transcript.slice(0, 240)}
          {transcript.length > 240 ? "…" : ""}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={handleSkip} disabled={continuePending}>
          Pular (estudante não leu)
        </Button>
        <Button onClick={onContinue} disabled={!canContinue}>
          {continuePending ? "Salvando..." : "Próximo →"}
        </Button>
      </div>
    </div>
  );
}
