"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMimeType } from "@/components/fluencia/fluency-browser-utils";

interface PartRecorderState {
  recording: boolean;
  blob: Blob | null;
  url: string | null;
  /** Segundos gravados (medidos no navegador; o servidor usa a duração do STT quando houver). */
  durationSeconds: number | null;
  error: string | null;
}

const INITIAL: PartRecorderState = { recording: false, blob: null, url: null, durationSeconds: null, error: null };

/** Gravação de uma parte da leitura automática: um `MediaRecorder` por vez, stream liberado ao parar/desmontar. */
export function usePartRecorder() {
  const [state, setState] = useState<PartRecorderState>(INITIAL);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clear = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setState(INITIAL);
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || (recorderRef.current && recorderRef.current.state !== "inactive")) return false;
    startingRef.current = true;
    clear();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const durationSeconds =
          startedAtRef.current != null ? Math.round((Date.now() - startedAtRef.current) / 1000) : null;
        startedAtRef.current = null;
        releaseStream();
        setState({ recording: false, blob, url, durationSeconds, error: null });
      };
      recorder.start(1000);
      startedAtRef.current = Date.now();
      setState((current) => ({ ...current, recording: true, error: null }));
      return true;
    } catch {
      releaseStream();
      setState({ ...INITIAL, error: "Não foi possível acessar o microfone. Verifique a permissão do navegador." });
      return false;
    } finally {
      startingRef.current = false;
    }
  }, [clear, releaseStream]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else releaseStream();
  }, [releaseStream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      releaseStream();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [releaseStream]);

  return { ...state, start, stop, clear };
}
