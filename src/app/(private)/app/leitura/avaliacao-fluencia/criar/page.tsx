import { Suspense } from "react";
import { CriarAvaliacaoPage } from "@/components/fluencia/criar-avaliacao-page";

export default function CriarAvaliacaoRoutePage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <CriarAvaliacaoPage />
    </Suspense>
  );
}
