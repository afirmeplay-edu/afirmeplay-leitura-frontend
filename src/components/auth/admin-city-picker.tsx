"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listCatalogCities, type CatalogCity } from "@/lib/api/catalog-cities";
import { getApiErrorMessage } from "@/lib/api/errors";
import { isAdminRole, roleUsesJwtCity } from "@/lib/auth/jwt";
import { getSelectedCityId, setCityContext } from "@/lib/city-domain";
import { useAuthStore } from "@/stores/auth-store";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminCityPickerProps {
  /** Chamado quando o contexto de município fica pronto (JWT ou escolha do admin). */
  onCityReadyChange?: (ready: boolean, cityId: string | null) => void;
}

export function AdminCityPicker({ onCityReadyChange }: AdminCityPickerProps) {
  const user = useAuthStore((state) => state.user);
  const selectedCityId = useAuthStore((state) => state.selectedCityId);
  const setAdminCityId = useAuthStore((state) => state.setAdminCityId);
  const isAdmin = isAdminRole(user?.role);
  const usesJwtCity = roleUsesJwtCity(user?.role);

  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [loading, setLoading] = useState(false);

  const notify = useCallback(
    (ready: boolean, cityId: string | null) => {
      onCityReadyChange?.(ready, cityId);
    },
    [onCityReadyChange]
  );

  useEffect(() => {
    if (usesJwtCity) {
      const cityId = selectedCityId || user?.city_id || getSelectedCityId() || null;
      if (cityId) {
        setCityContext({
          cityId,
          slug: user?.city_slug ?? undefined,
        });
        if (cityId !== selectedCityId) {
          setAdminCityId(cityId);
        }
      }
      notify(Boolean(cityId), cityId);
      return;
    }

    if (!isAdmin) {
      notify(Boolean(selectedCityId || user?.city_id), selectedCityId || user?.city_id || null);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listCatalogCities();
        if (cancelled) return;
        setCities(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Nao foi possivel carregar os municipios."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    notify,
    selectedCityId,
    setAdminCityId,
    user?.city_id,
    user?.city_slug,
    usesJwtCity,
  ]);

  useEffect(() => {
    if (isAdmin) {
      notify(Boolean(selectedCityId), selectedCityId);
    }
  }, [isAdmin, notify, selectedCityId]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <Label>Municipio</Label>
      <Select
        value={selectedCityId || undefined}
        onValueChange={(value) => setAdminCityId(value)}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={loading ? "Carregando municipios..." : "Selecione o municipio"}
          />
        </SelectTrigger>
        <SelectContent>
          {cities.map((city) => (
            <SelectItem key={city.id} value={city.id}>
              {city.name}
              {city.state ? ` / ${city.state}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Admin precisa escolher o municipio (X-City-ID / X-City-Slug) antes das rotas tenant.
      </p>
    </div>
  );
}
