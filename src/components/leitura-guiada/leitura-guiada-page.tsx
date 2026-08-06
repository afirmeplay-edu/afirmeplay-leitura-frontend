"use client";

import { useState } from "react";
import {
  GuidedSelectionForm,
  type GuidedSelection,
} from "@/components/leitura-guiada/guided-selection-form";
import { GuidedSessionFlow } from "@/components/leitura-guiada/guided-session-flow";

export function LeituraGuiadaPage() {
  const [selection, setSelection] = useState<GuidedSelection | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-3xl font-bold text-bluebrand-deep">Avaliacao de Leitura Guiada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fluxo livre: selecione um aluno e um texto, grave a leitura e registre a correcao do
          professor.
        </p>
      </section>

      {selection ? (
        <GuidedSessionFlow selection={selection} onRestart={() => setSelection(null)} />
      ) : (
        <GuidedSelectionForm onStart={setSelection} />
      )}
    </div>
  );
}
