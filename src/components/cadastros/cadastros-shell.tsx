"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";

interface CadastrosShellProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
}

export function CadastrosShell({ title, description, icon, actions, children }: CadastrosShellProps) {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
  }, []);

  return (
    <PageShell>
      <PageHeader eyebrow="Cadastros" title={title} description={description} icon={icon}>
        {actions}
      </PageHeader>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      {!cityReady || cityKey === "none" ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Selecione o município para carregar o catálogo.
        </p>
      ) : (
        <div key={cityKey}>{children}</div>
      )}
    </PageShell>
  );
}
