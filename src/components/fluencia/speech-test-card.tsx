"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/components/fluencia/fluency-browser-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogLevel = "info" | "result" | "error";

interface SttLogEntry {
  id: number;
  at: string;
  level: LogLevel;
  message: string;
}

interface SpeechTestCardProps {
  /** Quando a lista já está rodando, o pai pode empurrar eventos para o mesmo card. */
  externalLiveText?: string;
  externalLogs?: SttLogEntry[];
  /** Desativa o botão isolado (ex.: lista já em andamento). */
  disableStandaloneTest?: boolean;
  className?: string;
}

let logSeq = 0;

function nowLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function createSttLog(level: LogLevel, message: string): SttLogEntry {
  return { id: ++logSeq, at: nowLabel(), level, message };
}

/**
 * Card isolado para diagnosticar Web Speech: escreve o que você fala + log de erros.
 * Pode rodar sozinho (botão Testar) sem iniciar o cronômetro da lista.
 */
export function SpeechTestCard({
  externalLiveText,
  externalLogs,
  disableStandaloneTest = false,
  className,
}: SpeechTestCardProps) {
  const [testing, setTesting] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [logs, setLogs] = useState<SttLogEntry[]>([]);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const testingRef = useRef(false);

  function pushLog(level: LogLevel, message: string) {
    const entry = createSttLog(level, message);
    setLogs((prev) => [entry, ...prev].slice(0, 50));
    if (level === "error") {
      console.error("[WebSpeech]", message);
    } else {
      console.log("[WebSpeech]", message);
    }
  }

  function stopTest() {
    testingRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
    setTesting(false);
    pushLog("info", "Teste de fala parado.");
  }

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
    return () => {
      testingRef.current = false;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  function startTest() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      pushLog("error", "SpeechRecognition / webkitSpeechRecognition não existe neste navegador.");
      return;
    }

    stopTest();
    setLiveText("");
    testingRef.current = true;
    setTesting(true);

    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const item = event.results[i];
        const text = item[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (item.isFinal) {
          finals += `${text} `;
          pushLog("result", `FINAL: "${text}"`);
        } else {
          interim += `${text} `;
          pushLog("result", `interim: "${text}"`);
        }
      }
      if (interim) setLiveText(interim.trim());
      if (finals) {
        const chunk = finals.trim();
        setFinalText((prev) => `${prev} ${chunk}`.trim());
        setLiveText("");
      }
    };

    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      pushLog("error", `onerror: ${code}`);
      // no-speech/aborted são comuns em continuous; não param o teste
      if (code === "not-allowed" || code === "service-not-allowed") {
        pushLog("error", "Permissão/serviço de reconhecimento bloqueado. Use Chrome/Edge + HTTPS.");
        stopTest();
      }
      if (code === "network") {
        pushLog("error", "Erro de rede: o Web Speech do Chrome precisa de internet.");
      }
      if (code === "audio-capture") {
        pushLog("error", "Falha de captura de áudio no STT (pode conflitar com outro uso do mic).");
      }
    };

    recognition.onend = () => {
      pushLog("info", "onend disparado");
      if (testingRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
          pushLog("info", "reconhecimento reiniciado após onend");
        } catch (error) {
          pushLog(
            "error",
            `falha ao reiniciar: ${error instanceof Error ? error.message : String(error)}`
          );
          testingRef.current = false;
          setTesting(false);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      pushLog("info", "Teste iniciado (lang=pt-BR, continuous=true). Fale algo.");
    } catch (error) {
      pushLog(
        "error",
        `falha ao start(): ${error instanceof Error ? error.message : String(error)}`
      );
      testingRef.current = false;
      setTesting(false);
    }
  }

  const displayLive = externalLiveText ?? liveText;
  const displayLogs = externalLogs && externalLogs.length > 0 ? externalLogs : logs;

  return (
    <div className={cn("space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">Card de teste — o que eu falo</p>
          <p className="text-xs text-muted-foreground">
            Diagnóstico do Web Speech (independente do cronômetro). Se a barra do mic reage mas aqui
            não aparece texto, o problema é o STT (navegador/rede), não o microfone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!testing ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!supported || disableStandaloneTest}
              onClick={startTest}
            >
              <Mic className="h-4 w-4" />
              Testar fala
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={stopTest}>
              <Square className="h-4 w-4" />
              Parar teste
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setLogs([]);
              setLiveText("");
              setFinalText("");
            }}
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>

      {!supported ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Web Speech API indisponível neste navegador. Use Chrome ou Edge (HTTPS/localhost).
        </p>
      ) : null}

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ao vivo (interim)
        </p>
        <div
          className={cn(
            "min-h-[48px] rounded-md border bg-white px-3 py-2 text-base",
            testing && "border-bluebrand-base",
            !displayLive && "text-muted-foreground"
          )}
        >
          {displayLive || (testing ? "Aguardando você falar…" : "Clique em “Testar fala” e fale.")}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Confirmado (final)
        </p>
        <div className="min-h-[48px] rounded-md border bg-white px-3 py-2 text-sm text-slate-800">
          {finalText || "—"}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Log de erros / eventos
        </p>
        <div className="max-h-40 overflow-auto rounded-md border bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-100">
          {displayLogs.length === 0 ? (
            <span className="text-slate-400">Sem eventos ainda.</span>
          ) : (
            displayLogs.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "border-b border-slate-700/60 py-0.5 last:border-0",
                  entry.level === "error" && "text-red-300",
                  entry.level === "result" && "text-emerald-300",
                  entry.level === "info" && "text-sky-200"
                )}
              >
                <span className="text-slate-400">[{entry.at}]</span> {entry.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
