import { Suspense } from "react";
import { FluenciaSelecao } from "@/components/fluencia/fluencia-selecao";

export default function AvaliacaoFluenciaPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <FluenciaSelecao />
    </Suspense>
  );
}
