"use client";

import { useCallback, useState, type ReactNode } from "react";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";

interface IcaCityScopeProps {
  children: ReactNode;
  emptyMessage?: string;
}

/**
 * Mesmo padrão da Leitura (`CadastrosShell`): o admin escolhe o município na página; para os demais papéis
 * o `AdminCityPicker` não renderiza nada e usa o município do login. A visibilidade CITY das questões
 * depende desse contexto (`X-City-ID`). Os filhos remontam ao trocar de município.
 */
export function IcaCityScope({
  children,
  emptyMessage = "Selecione o município para carregar os dados do ICA.",
}: IcaCityScopeProps) {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
  }, []);

  return (
    <div className="space-y-6">
      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />
      {!cityReady || cityKey === "none" ? (
        <p className="surface-panel border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div key={cityKey}>{children}</div>
      )}
    </div>
  );
}
