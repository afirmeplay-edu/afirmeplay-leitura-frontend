"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import type {
  FluencyMarkingSource,
  FluencyNotReadReason,
  FluencyTextLinePayload,
  FluencyTextPartPayload,
  FluencyWordStatus,
} from "@/lib/api/afirme-reading";
import {
  computeRms,
  getSpeechRecognitionCtor,
  hypothesisMatchesExpected,
  pickRecorderMimeType,
  tokenizeNarrative,
  voiceThresholdFromNoiseFloor,
  type SpeechRecognitionLike,
} from "@/components/fluencia/fluency-browser-utils";
import {
  NOT_READ_REASON_OPTIONS,
  type NotReadReasonValue,
} from "@/components/fluencia/not-read-reasons";
import { ReadingCursorStage } from "@/components/fluencia/reading-cursor-stage";
import { createSttLog, SpeechTestCard } from "@/components/fluencia/speech-test-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface FluencyNarrativePartResult extends FluencyTextPartPayload {
  audioBlob: Blob | null;
}

interface NarrativeFluencyStepProps {
  title: string;
  content: string;
  continuePending?: boolean;
  onResultChange: (result: FluencyNarrativePartResult | null) => void;
  onContinue: () => void;
}

const SILENCE_MS = 3000;
const RMS_SPEECH_THRESHOLD_FALLBACK = 0.04;
const NOISE_CALIBRATION_MS = 900;

const ERROR_STATUSES: readonly FluencyWordStatus[] = [
  "nao_leu",
  "errou",
  "inventou",
  "soletrou",
];

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function sttErrorMessage(code: string | undefined) {
  switch (code) {
    case "not-allowed":
      return "Permissão de reconhecimento de voz negada.";
    case "network":
      return "Web Speech precisa de internet.";
    case "service-not-allowed":
      return "Serviço de reconhecimento bloqueado.";
    case "audio-capture":
      return "Falha ao capturar áudio para o STT.";
    case "no-speech":
      return null;
    default:
      return code ? `Web Speech: ${code}` : "Falha no reconhecimento de voz.";
  }
}

export function NarrativeFluencyStep({
  title,
  content,
  continuePending = false,
  onResultChange,
  onContinue,
}: NarrativeFluencyStepProps) {
  const speechAvailable = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);
  const { lines, tokens } = useMemo(() => tokenizeNarrative(content), [content]);
  const totalWords = tokens.length;
  const lineWordCounts = useMemo(
    () => lines.map((_, lineIndex) => tokens.filter((t) => t.lineIndex === lineIndex).length),
    [lines, tokens]
  );

  const [aiActive, setAiActive] = useState(speechAvailable);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [statuses, setStatuses] = useState<Array<FluencyWordStatus | null>>(() =>
    tokens.map(() => null)
  );
  const [cursor, setCursor] = useState(0);
  const [wrongByLine, setWrongByLine] = useState<number[]>(() => lines.map(() => 0));
  const [wordsRead, setWordsRead] = useState(String(totalWords));
  const [errorsOverride, setErrorsOverride] = useState<string | null>(null);
  const [unreadAfterEnd, setUnreadAfterEnd] = useState("0");
  const [obeyedSensePauses, setObeyedSensePauses] = useState<"sim" | "nao" | "">("");
  const [motivo, setMotivo] = useState<NotReadReasonValue>("nao_se_aplica");
  const [skipped, setSkipped] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [liveHeard, setLiveHeard] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [hearingSpeech, setHearingSpeech] = useState(false);
  const [voiceThresholdUi, setVoiceThresholdUi] = useState(RMS_SPEECH_THRESHOLD_FALLBACK);
  const [sttStatus, setSttStatus] = useState("");
  const [sttLogs, setSttLogs] = useState<
    Array<{ id: number; at: string; level: "info" | "result" | "error"; message: string }>
  >([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const onResultChangeRef = useRef(onResultChange);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const voiceThresholdRef = useRef(RMS_SPEECH_THRESHOLD_FALLBACK);
  const noiseSamplesRef = useRef<number[]>([]);
  const meterStartedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const isRunningRef = useRef(false);
  const aiActiveRef = useRef(aiActive);
  const cursorRef = useRef(0);
  const statusesRef = useRef(statuses);
  const tokensRef = useRef(tokens);
  const linesRef = useRef(lines);
  const transcriptRef = useRef("");
  const advancingLockRef = useRef(false);
  const audioBlobRef = useRef<Blob | null>(null);

  onResultChangeRef.current = onResultChange;
  aiActiveRef.current = aiActive;
  tokensRef.current = tokens;
  linesRef.current = lines;

  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  function pushSttLog(level: "info" | "result" | "error", message: string) {
    const entry = createSttLog(level, message);
    setSttLogs((prev) => [entry, ...prev].slice(0, 50));
    if (level === "error") console.error("[WebSpeech/Q3]", message);
    else console.log("[WebSpeech/Q3]", message);
  }

  function stopMeter() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
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

  function stopRecorder(): Promise<Blob | null> {
    return new Promise((resolve) => {
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
        const next = blob.size > 0 ? blob : null;
        audioBlobRef.current = next;
        setAudioBlob(next);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(next);
      };
      try {
        recorder.stop();
      } catch {
        resolve(audioBlobRef.current);
      }
    });
  }

  function resetWordSilenceClock() {
    silenceStartedAtRef.current = Date.now();
    advancingLockRef.current = false;
  }

  function buildWrongByLine(nextStatuses: Array<FluencyWordStatus | null>) {
    const counts = linesRef.current.map(() => 0);
    tokensRef.current.forEach((token, index) => {
      const status = nextStatuses[index];
      if (status && ERROR_STATUSES.includes(status)) {
        counts[token.lineIndex] = (counts[token.lineIndex] ?? 0) + 1;
      }
    });
    return counts;
  }

  function buildResultFromState(
    nextStatuses: Array<FluencyWordStatus | null>,
    options?: {
      skipped?: boolean;
      reason?: FluencyNotReadReason | null;
      blob?: Blob | null;
      elapsed?: number;
    }
  ): FluencyNarrativePartResult {
    const skipped = Boolean(options?.skipped);
    let lastPos = 0;
    for (let i = 0; i < nextStatuses.length; i += 1) {
      if (nextStatuses[i] != null) lastPos = i + 1;
    }
    const errorsCount = nextStatuses.filter(
      (s) => s != null && ERROR_STATUSES.includes(s)
    ).length;
    const wrong = buildWrongByLine(nextStatuses);
    const linePayload: FluencyTextLinePayload[] = linesRef.current.map((text, lineIndex) => ({
      lineIndex,
      text,
      wrongWordsCount: wrong[lineIndex] ?? 0,
    }));

    return {
      wordsRead: skipped ? 0 : lastPos,
      totalWords: tokensRef.current.length,
      errorsCount: skipped ? 0 : errorsCount,
      unreadAfterEnd: skipped
        ? tokensRef.current.length
        : Math.max(0, tokensRef.current.length - lastPos),
      readingTimeSeconds: skipped ? 0 : Math.max(1, options?.elapsed ?? elapsedSeconds),
      skipped,
      notReadReason:
        options?.reason ??
        (motivo === "nao_se_aplica" ? null : (motivo as FluencyNotReadReason)),
      obeyedSensePauses:
        skipped
          ? null
          : obeyedSensePauses === "sim"
            ? true
            : obeyedSensePauses === "nao"
              ? false
              : null,
      transcript: transcriptRef.current.trim() || null,
      lines: linePayload,
      sttProvider: transcriptRef.current ? "web_speech_api" : undefined,
      audioBlob: options?.blob ?? audioBlobRef.current,
    };
  }

  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    isRunningRef.current = false;
    setIsFinished(false);
    finishedRef.current = false;
    setStatuses(tokens.map(() => null));
    setCursor(0);
    cursorRef.current = 0;
    setWrongByLine(lines.map(() => 0));
    setWordsRead(String(tokens.length));
    setErrorsOverride(null);
    setUnreadAfterEnd("0");
    setObeyedSensePauses("");
    setMotivo("nao_se_aplica");
    setSkipped(false);
    setAudioBlob(null);
    audioBlobRef.current = null;
    setTranscript("");
    transcriptRef.current = "";
    setLiveHeard("");
    setSttLogs([]);
    setSttStatus("");
    onResultChangeRef.current(null);
    stopRecognition();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void stopRecorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, tokens, lines]);

  useEffect(() => {
    return () => {
      stopRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
      void stopRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyStatus(
    index: number,
    status: FluencyWordStatus,
    _source: FluencyMarkingSource,
    advance: boolean
  ) {
    if (finishedRef.current) return;
    if (statusesRef.current[index] != null) {
      advancingLockRef.current = false;
      return;
    }

    const nextStatuses = [...statusesRef.current];
    nextStatuses[index] = status;
    statusesRef.current = nextStatuses;
    advancingLockRef.current = false;

    const nextCursor = advance ? index + 1 : index;
    if (advance) {
      cursorRef.current = nextCursor;
      setCursor(nextCursor);
      setWordsRead(String(Math.min(nextCursor, tokensRef.current.length)));
      setUnreadAfterEnd(
        String(
          Math.max(0, tokensRef.current.length - Math.min(nextCursor, tokensRef.current.length))
        )
      );
      resetWordSilenceClock();
    }

    setStatuses(nextStatuses);
    setWrongByLine(buildWrongByLine(nextStatuses));
    setErrorsOverride(null);

    const pastEnd = advance && nextCursor >= tokensRef.current.length;
    const allDone = nextStatuses.every((s) => s != null);
    if (allDone || pastEnd) {
      queueMicrotask(() => {
        void finishReading(nextStatuses);
      });
    }
  }

  function handleAcousticSilenceTimeout() {
    if (finishedRef.current || !isRunningRef.current || advancingLockRef.current) return;
    const index = cursorRef.current;
    if (index >= tokensRef.current.length) return;
    if (statusesRef.current[index] != null) return;
    advancingLockRef.current = true;
    pushSttLog("info", `silêncio ${SILENCE_MS}ms → Não leu`);
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
          const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
          const next = voiceThresholdFromNoiseFloor(floor);
          voiceThresholdRef.current = next;
          setVoiceThresholdUi(next);
        }
      } else if (noiseSamplesRef.current.length > 0 && elapsedMeter < NOISE_CALIBRATION_MS + 50) {
        pushSttLog("info", `piso calibrado → limiar=${voiceThresholdRef.current.toFixed(3)}`);
        noiseSamplesRef.current = [];
      }

      const speaking = rms >= voiceThresholdRef.current;
      setHearingSpeech(speaking);
      if (speaking) {
        silenceStartedAtRef.current = null;
      } else if (silenceStartedAtRef.current == null) {
        silenceStartedAtRef.current = Date.now();
      } else if (Date.now() - silenceStartedAtRef.current >= SILENCE_MS) {
        silenceStartedAtRef.current = null;
        handleAcousticSilenceTimeout();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function evaluateRecognitionResult(alternatives: string[], isFinal: boolean) {
    if (!aiActiveRef.current || finishedRef.current) return;
    const cleaned = alternatives.map((t) => t.trim()).filter(Boolean);
    if (cleaned.length === 0) return;

    const primary = cleaned[0];
    if (isFinal) {
      transcriptRef.current = `${transcriptRef.current} ${primary}`.trim();
      setTranscript(transcriptRef.current);
      setLiveHeard("");
      pushSttLog("result", `FINAL: "${primary}"`);
    } else {
      setLiveHeard(primary);
      pushSttLog("result", `interim: "${primary}"`);
    }
    setSttStatus(isFinal ? "hipótese final" : "ouvindo…");

    for (const text of cleaned) {
      const index = cursorRef.current;
      if (index >= tokensRef.current.length || statusesRef.current[index] != null) return;
      const expected = tokensRef.current[index]?.word;
      if (!expected) return;
      silenceStartedAtRef.current = null;

      const match = hypothesisMatchesExpected(expected, text);
      if (match.matched) {
        pushSttLog(
          "info",
          `match ${match.kind} → "${expected}" / "${match.token ?? text}"`
        );
        applyStatus(index, "acertou", "ia", true);
        return;
      }

      // Lookahead: se casou com a próxima, marca a atual como não leu e a próxima como acertou.
      if (index + 1 < tokensRef.current.length) {
        const nextExpected = tokensRef.current[index + 1]?.word;
        if (nextExpected && hypothesisMatchesExpected(nextExpected, text).matched) {
          pushSttLog("info", `lookahead: palavra ${index + 1} pulada → acertou ${index + 2}`);
          applyStatus(index, "nao_leu", "timeout", true);
          applyStatus(index + 1, "acertou", "ia", true);
          return;
        }
      }
    }

    if (isFinal) {
      const index = cursorRef.current;
      if (index >= tokensRef.current.length || statusesRef.current[index] != null) return;
      pushSttLog(
        "info",
        `sem match → inventou (esperado: "${tokensRef.current[index]?.word}", ouviu: "${primary}")`
      );
      applyStatus(index, "inventou", "ia", true);
    }
  }

  function startRecognition() {
    if (!aiActiveRef.current) {
      setSttStatus("IA desligada");
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.message("Web Speech indisponível. Use marcação manual.");
      setAiActive(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alts: string[] = [];
        for (let a = 0; a < Math.max(1, result.length || 1); a += 1) {
          const t = result[a]?.transcript?.trim();
          if (t) alts.push(t);
        }
        evaluateRecognitionResult(alts, result.isFinal);
      }
    };
    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      pushSttLog("error", `onerror: ${code}`);
      if (code === "no-speech" || code === "aborted") return;
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
      if (!finishedRef.current && aiActiveRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch (error) {
          pushSttLog(
            "error",
            `reinício falhou: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setSttStatus("reconhecimento ativo");
      pushSttLog("info", "STT iniciado na Q3.");
    } catch (error) {
      pushSttLog(
        "error",
        `start falhou: ${error instanceof Error ? error.message : String(error)}`
      );
      setAiActive(false);
    }
  }

  async function startReading() {
    if (isRunning || !content || tokens.length === 0) return;
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
      toast.error("Não foi possível acessar o microfone.");
      return;
    }

    startedAtRef.current = Date.now();
    finishedRef.current = false;
    setElapsedSeconds(0);
    setIsRunning(true);
    isRunningRef.current = true;
    setIsFinished(false);
    setSkipped(false);
    setCursor(0);
    cursorRef.current = 0;
    setStatuses(tokens.map(() => null));
    statusesRef.current = tokens.map(() => null);
    setWrongByLine(lines.map(() => 0));
    setWordsRead("0");
    setUnreadAfterEnd(String(tokens.length));
    onResultChangeRef.current(null);
    resetWordSilenceClock();

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);

    startRecognition();
  }

  async function finishReading(nextStatuses?: Array<FluencyWordStatus | null>) {
    if (finishedRef.current && !nextStatuses) return;
    stopRecognition();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    setElapsedSeconds(elapsed);
    finishedRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    setIsFinished(true);
    const blob = await stopRecorder();
    const statusesNow = nextStatuses ?? statusesRef.current;
    const wrong = buildWrongByLine(statusesNow);
    setWrongByLine(wrong);
    let lastPos = 0;
    for (let i = 0; i < statusesNow.length; i += 1) {
      if (statusesNow[i] != null) lastPos = i + 1;
    }
    setWordsRead(String(lastPos));
    setUnreadAfterEnd(String(Math.max(0, tokensRef.current.length - lastPos)));
    const payload = buildResultFromState(statusesNow, { blob, elapsed });
    // paused sense ainda não respondido → onResultChange fica null até o aplicador escolher
    if (payload.obeyedSensePauses == null && !payload.skipped) {
      onResultChangeRef.current(null);
    } else {
      onResultChangeRef.current(payload);
    }
  }

  function adjustWrong(lineIndex: number, delta: number) {
    setWrongByLine((prev) => {
      const next = [...prev];
      const max = lineWordCounts[lineIndex] ?? 0;
      next[lineIndex] = Math.max(0, Math.min(max, (next[lineIndex] ?? 0) + delta));
      return next;
    });
    setErrorsOverride(null);
  }

  function handleSkip() {
    const reason =
      motivo === "nao_se_aplica" ? ("recusou" as FluencyNotReadReason) : (motivo as FluencyNotReadReason);
    if (motivo === "nao_se_aplica") setMotivo("recusou");
    setSkipped(true);
    finishedRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    setIsFinished(true);
    stopRecognition();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void stopRecorder();
    const empty = tokens.map(() => null);
    setStatuses(empty);
    statusesRef.current = empty;
    const payload = buildResultFromState(empty, { skipped: true, reason, blob: null, elapsed: 0 });
    onResultChangeRef.current(payload);
  }

  const autoErrors = useMemo(
    () => wrongByLine.reduce((sum, value) => sum + value, 0),
    [wrongByLine]
  );
  const parsedWordsRead = Number.parseInt(wordsRead, 10);
  const parsedUnread = Number.parseInt(unreadAfterEnd, 10);
  const parsedErrors =
    errorsOverride != null && errorsOverride !== ""
      ? Number.parseInt(errorsOverride, 10)
      : autoErrors;
  const wordsReadValid =
    Number.isFinite(parsedWordsRead) && parsedWordsRead >= 0 && parsedWordsRead <= totalWords;
  const errorsValid = Number.isFinite(parsedErrors) && parsedErrors >= 0;

  useEffect(() => {
    if (!isFinished || skipped) return;
    if (!wordsReadValid || !errorsValid) {
      onResultChangeRef.current(null);
      return;
    }
    if (obeyedSensePauses !== "sim" && obeyedSensePauses !== "nao") {
      onResultChangeRef.current(null);
      return;
    }
    const unread = Number.isFinite(parsedUnread)
      ? parsedUnread
      : Math.max(0, totalWords - parsedWordsRead);
    onResultChangeRef.current({
      wordsRead: parsedWordsRead,
      totalWords,
      errorsCount: parsedErrors,
      unreadAfterEnd: unread,
      readingTimeSeconds: Math.max(1, elapsedSeconds),
      skipped: false,
      notReadReason: motivo === "nao_se_aplica" ? null : (motivo as FluencyNotReadReason),
      obeyedSensePauses: obeyedSensePauses === "sim",
      transcript: transcriptRef.current.trim() || null,
      lines: lines.map((text, lineIndex) => ({
        lineIndex,
        text,
        wrongWordsCount: wrongByLine[lineIndex] ?? 0,
      })),
      sttProvider: transcriptRef.current ? "web_speech_api" : undefined,
      audioBlob: audioBlobRef.current,
    });
  }, [
    isFinished,
    skipped,
    wordsReadValid,
    errorsValid,
    parsedWordsRead,
    parsedErrors,
    parsedUnread,
    elapsedSeconds,
    totalWords,
    lines,
    wrongByLine,
    motivo,
    obeyedSensePauses,
    audioBlob,
  ]);

  const cursorItems = useMemo(
    () =>
      tokens.map((token, index) => ({
        id: `t-${index}`,
        label: token.display,
        status: statuses[index] ?? null,
      })),
    [tokens, statuses]
  );

  const canContinue =
    isFinished &&
    (skipped ||
      (wordsReadValid &&
        errorsValid &&
        (obeyedSensePauses === "sim" || obeyedSensePauses === "nao")));

  const levelPercent = Math.min(100, Math.round(micLevel * 400));

  if (!content || tokens.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Texto não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          QUESTÃO 3 — LEITURA DE TEXTO
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
        <p className="mt-2">
          A história é acompanhada palavra a palavra (destaque azul). Match fonético/fuzzy como nas
          listas. Inventou só com hipótese final do STT.
        </p>
        {isRunning ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>
                {hearingSpeech ? "Fala acima do limiar" : "Abaixo do limiar…"} · limiar{" "}
                {voiceThresholdUi.toFixed(3)}
              </span>
              <span>{sttStatus || "—"}</span>
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
          <li>Peça ao estudante para ler o texto em voz alta, com atenção.</li>
          <li>Informe que depois haverá perguntas de compreensão.</li>
        </ul>
      </div>

      <SpeechTestCard
        disableStandaloneTest={isRunning}
        externalLiveText={isRunning ? liveHeard : undefined}
        externalLogs={isRunning || sttLogs.length > 0 ? sttLogs : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tempo de leitura</p>
          <span className="font-mono text-3xl font-bold tabular-nums text-violet-700">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isRunning && !isFinished ? (
            <Button
              onClick={() => void startReading()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Mic className="h-4 w-4" />
              Iniciar gravação + leitura
            </Button>
          ) : null}
          {isRunning ? (
            <>
              <span className="flex items-center gap-2 text-sm text-red-600">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
                Leitura em andamento
              </span>
              <Button
                onClick={() => void finishReading()}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Square className="h-4 w-4" />
                Finalizar leitura
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <ReadingCursorStage
        mode="narrative"
        items={cursorItems}
        cursor={cursor}
        listening={isRunning && !isFinished}
        instruction="LEIA EM VOZ ALTA A PALAVRA DESTACADA"
        onSelectIndex={
          isRunning && !isFinished
            ? (index) => {
                setCursor(index);
                cursorRef.current = index;
                resetWordSilenceClock();
              }
            : undefined
        }
      />

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Nº da linha</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead className="w-40 text-center">Palavras lidas erradas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={`${index}-${line.slice(0, 12)}`}>
                <TableCell className="text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </TableCell>
                <TableCell className="font-medium uppercase tracking-wide">{line}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isFinished || skipped}
                      onClick={() => adjustWrong(index, -1)}
                    >
                      −
                    </Button>
                    <span
                      className={cn(
                        "min-w-8 text-center font-mono text-lg",
                        (wrongByLine[index] ?? 0) > 0 && "text-red-600"
                      )}
                    >
                      {wrongByLine[index] ?? 0}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isFinished || skipped}
                      onClick={() => adjustWrong(index, 1)}
                    >
                      +
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold uppercase tracking-wide text-bluebrand-deep">
          Registro de leitura de texto
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="q3-words-read">Posição da última palavra lida</Label>
            <Input
              id="q3-words-read"
              type="number"
              min={0}
              max={totalWords}
              value={wordsRead}
              disabled={!isFinished || skipped}
              onChange={(event) => {
                setWordsRead(event.target.value);
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(value)) {
                  setUnreadAfterEnd(String(Math.max(0, totalWords - value)));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Total de palavras do texto: {totalWords}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="q3-errors">Total de palavras lidas de modo errado</Label>
            <Input
              id="q3-errors"
              type="number"
              min={0}
              value={errorsOverride ?? String(autoErrors)}
              disabled={!isFinished || skipped}
              onChange={(event) => setErrorsOverride(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="q3-unread">Palavras não lidas (após o encerramento)</Label>
          <Input
            id="q3-unread"
            type="number"
            min={0}
            value={unreadAfterEnd}
            disabled={!isFinished || skipped}
            onChange={(event) => setUnreadAfterEnd(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>O estudante obedeceu às pausas de sentido?</Label>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sense-pauses"
                checked={obeyedSensePauses === "sim"}
                disabled={!isFinished || skipped}
                onChange={() => setObeyedSensePauses("sim")}
              />
              Sim
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sense-pauses"
                checked={obeyedSensePauses === "nao"}
                disabled={!isFinished || skipped}
                onChange={() => setObeyedSensePauses("nao")}
              />
              Não
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Motivo (caso o estudante não tenha lido)</Label>
          <Select value={motivo} onValueChange={(value) => setMotivo(value as NotReadReasonValue)}>
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
          Transcript: {transcript.slice(0, 280)}
          {transcript.length > 280 ? "…" : ""}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleSkip}
          disabled={continuePending || isRunning}
        >
          Pular (estudante não leu)
        </Button>
        <Button onClick={onContinue} disabled={!canContinue || continuePending}>
          {continuePending ? "Salvando..." : "Próximo: Compreensão →"}
        </Button>
      </div>
    </div>
  );
}
