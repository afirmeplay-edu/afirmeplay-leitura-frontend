"use client";

import { useCallback, useState } from "react";
import { WordListsPanel } from "@/components/afirme-reading/word-lists-panel";
import { TextsPanel } from "@/components/afirme-reading/texts-panel";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { cn } from "@/lib/utils";

type Tab = "listas" | "textos";

export function ConfiguracaoAvaliacaoPage() {
  const [tab, setTab] = useState<Tab>("listas");
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section>
        <h1 className="text-3xl font-bold text-bluebrand-deep">
          Configurar Avaliacao de Fluencia Leitora
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre listas de palavras e textos que serao utilizados na aplicacao.
        </p>
      </section>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setTab("listas")}
            className={cn(
              "px-6 py-3 text-sm font-medium transition",
              tab === "listas"
                ? "border-b-2 border-bluebrand-base text-bluebrand-deep"
                : "text-muted-foreground hover:bg-slate-50"
            )}
          >
            Listas de palavras
          </button>
          <button
            type="button"
            onClick={() => setTab("textos")}
            className={cn(
              "px-6 py-3 text-sm font-medium transition",
              tab === "textos"
                ? "border-b-2 border-bluebrand-base text-bluebrand-deep"
                : "text-muted-foreground hover:bg-slate-50"
            )}
          >
            Textos e perguntas
          </button>
        </div>

        <div className="p-6">
          {!cityReady ? (
            <p className="text-sm text-muted-foreground">
              Selecione o municipio para carregar o catalogo.
            </p>
          ) : tab === "listas" ? (
            <WordListsPanel key={`listas-${cityKey}`} />
          ) : (
            <TextsPanel key={`textos-${cityKey}`} />
          )}
        </div>
      </section>
    </div>
  );
}
