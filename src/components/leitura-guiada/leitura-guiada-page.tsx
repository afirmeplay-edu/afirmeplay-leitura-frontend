"use client";

import { useSearchParams } from "next/navigation";
import { CaedAplicador } from "@/components/fluencia/caed-aplicador";
import { FluenciaSelecao } from "@/components/fluencia/fluencia-selecao";

export function LeituraGuiadaPage() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId");

  if (sessionId) {
    return <CaedAplicador mode="praticar" />;
  }

  return <FluenciaSelecao variant="praticar" />;
}
