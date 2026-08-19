import { Suspense } from "react";
import { LeituraGuiadaPage } from "@/components/leitura-guiada/leitura-guiada-page";

export default function AvaliacaoLeituraGuiadaRoutePage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <LeituraGuiadaPage />
    </Suspense>
  );
}
