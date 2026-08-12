"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { pickRecorderMimeType } from "@/components/fluencia/fluency-browser-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAMPLE_WORDS = ["TATU", "MAR", "VACA"] as const;
const LEVEL_THRESHOLD = 0.02;

interface MicrophoneTestStepProps {
  onContinue: (audioBlob: Blob | null) => void;
  continuePending?: boolean;
}

export function MicrophoneTestStep({
  onContinue,
  continuePending = false,
}: MicrophoneTestStepProps) {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [heardAudio, setHeardAudio] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);

  function cleanupMeter() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  function stopRecorder(): Promise<Blob | null> {
    return new Promise((resolve) => {
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

  async function stopTest() {
    cleanupMeter();
    await stopRecorder();
    setTesting(false);
    setLevel(0);
  }

  useEffect(() => {
    return () => {
      cleanupMeter();
      void stopRecorder();
    };
  }, []);

  async function startTest() {
    setPermissionError(false);
    setHeardAudio(false);
    setLevel(0);
    audioBlobRef.current = null;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(500);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        const current = analyserRef.current;
        if (!current) return;
        current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(rms);
        if (rms >= LEVEL_THRESHOLD) setHeardAudio(true);
        rafRef.current = requestAnimationFrame(tick);
      };

      setTesting(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setPermissionError(true);
      toast.error("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
      await stopTest();
    }
  }

  async function handleContinue() {
    if (testing) await stopTest();
    onContinue(audioBlobRef.current);
  }

  const levelPercent = Math.min(100, Math.round(level * 400));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-bluebrand-deep">Teste de microfone</h2>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold text-amber-800">[APLICADOR]</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Antes de começar, vamos testar o microfone.</li>
          <li>
            Vou pedir para você ler estas três palavras em voz alta, com calma: TATU, MAR, VACA.
          </li>
          <li>Pode ler agora.</li>
        </ul>
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Exemplos para teste de microfone
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {SAMPLE_WORDS.map((word) => (
            <span
              key={word}
              className="rounded-lg border bg-white px-6 py-4 text-xl font-bold tracking-wide text-bluebrand-deep"
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Nível do microfone</p>
          {heardAudio ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Áudio captado
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Aguardando fala...</span>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-75",
              heardAudio ? "bg-emerald-500" : "bg-bluebrand-base"
            )}
            style={{ width: `${levelPercent}%` }}
          />
        </div>
        {permissionError ? (
          <p className="text-sm text-red-600">
            Permissão negada ou microfone indisponível. Libere o acesso e tente novamente.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        {!testing ? (
          <Button variant="outline" onClick={() => void startTest()}>
            <Mic className="h-4 w-4" />
            Testar microfone
          </Button>
        ) : (
          <Button variant="outline" onClick={() => void stopTest()}>
            <Square className="h-4 w-4" />
            Parar teste
          </Button>
        )}
        <Button onClick={() => void handleContinue()} disabled={!heardAudio || continuePending}>
          {continuePending ? "Enviando..." : "Microfone OK, prosseguir →"}
        </Button>
      </div>
    </div>
  );
}
