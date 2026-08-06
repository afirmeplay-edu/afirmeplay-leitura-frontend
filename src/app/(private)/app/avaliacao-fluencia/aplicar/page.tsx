import { Suspense } from "react";
import { CaedAplicador } from "@/components/fluencia/caed-aplicador";

export default function AplicarFluenciaPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <CaedAplicador />
    </Suspense>
  );
}
