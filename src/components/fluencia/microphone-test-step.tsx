"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAMPLE_WORDS = ["TATU", "MAR", "VACA"] as const;
const LEVEL_THRESHOLD = 0.02;

interface MicrophoneTestStepProps {
  onContinue: () => void;
}

export function MicrophoneTestStep({ onContinue }: MicrophoneTestStepProps) {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [heardAudio, setHeardAudio] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  function stopTest() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTesting(false);
    setLevel(0);
  }

  useEffect(() => {
    return () => {
      stopTest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startTest() {
    setPermissionError(false);
    setHeardAudio(false);
    setLevel(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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
        if (rms >= LEVEL_THRESHOLD) {
          setHeardAudio(true);
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      setTesting(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setPermissionError(true);
      toast.error("Nao foi possivel acessar o microfone. Verifique a permissao do navegador.");
      stopTest();
    }
  }

  const levelPercent = Math.min(100, Math.round(level * 400));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Teste de microfone</h2>
        <p className="mt-1 text-muted-foreground">
          Peca ao aluno para ler as palavras abaixo em voz alta. Nenhuma gravacao e salva nesta etapa.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {SAMPLE_WORDS.map((word) => (
          <span
            key={word}
            className="rounded-lg border bg-slate-50 px-4 py-3 text-lg font-bold tracking-wide text-bluebrand-deep"
          >
            {word}
          </span>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Nivel do microfone</p>
          {heardAudio ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Audio captado
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
            Permissao negada ou microfone indisponivel. Libere o acesso e tente novamente.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {!testing ? (
          <Button onClick={() => void startTest()}>
            <Mic className="h-4 w-4" />
            Testar microfone
          </Button>
        ) : (
          <Button variant="outline" onClick={stopTest}>
            <Square className="h-4 w-4" />
            Parar teste
          </Button>
        )}
        <Button onClick={onContinue} disabled={!heardAudio}>
          Iniciar Q1
        </Button>
      </div>
    </div>
  );
}
