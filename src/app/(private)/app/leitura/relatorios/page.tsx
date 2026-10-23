import { Suspense } from "react";
import { RelatoriosHub } from "@/components/relatorios/relatorios-hub";

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <RelatoriosHub />
    </Suspense>
  );
}
