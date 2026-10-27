import { Suspense } from "react";
import { WizardSessao } from "@/components/leitura-guiada/wizard-sessao";

export default function SessaoLeituraPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <WizardSessao />
    </Suspense>
  );
}
