"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "@/stores/auth-store";

const CHUNK_RELOAD_KEY = "afirmeplay-chunk-reload";

function isChunkLoadFailure(error: unknown) {
  if (!error) return false;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === "ChunkLoadError" ||
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError")
  );
}

function reloadOnceOnChunkError() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

export function AppProviders({ children }: PropsWithChildren) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);

    const onError = (event: ErrorEvent) => {
      if (isChunkLoadFailure(event.error) || isChunkLoadFailure(event.message)) {
        event.preventDefault();
        reloadOnceOnChunkError();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadFailure(event.reason)) {
        event.preventDefault();
        reloadOnceOnChunkError();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
