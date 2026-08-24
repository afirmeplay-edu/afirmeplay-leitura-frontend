"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StudentAudioPlayerProps {
  blob?: Blob | null;
  src?: string | null;
  className?: string;
  label?: string;
}

export function StudentAudioPlayer({
  blob,
  src,
  className,
  label = "Gravação do aluno",
}: StudentAudioPlayerProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob && blob.size > 0) {
      const next = URL.createObjectURL(blob);
      setUrl(next);
      return () => URL.revokeObjectURL(next);
    }
    setUrl(src ?? null);
    return undefined;
  }, [blob, src]);

  return (
    <div className={cn("rounded-lg border bg-slate-50 p-3", className)}>
      <p className="mb-2 text-sm font-medium text-bluebrand-deep">{label}</p>
      {url ? (
        <audio controls src={url} className="w-full" />
      ) : (
        <p className="rounded-md border border-dashed bg-white px-3 py-2 text-sm text-muted-foreground">
          Aguardando gravação
        </p>
      )}
    </div>
  );
}
