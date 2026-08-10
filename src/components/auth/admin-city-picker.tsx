"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchAvailableCities, type AvailableCity } from "@/lib/api/cities";
import { listCatalogCities, type CatalogCity } from "@/lib/api/catalog-cities";
import { getApiErrorMessage } from "@/lib/api/errors";
import { isAdminRole, roleUsesJwtCity } from "@/lib/auth/jwt";
import {
  getSelectedCityId,
  getSelectedCitySlug,
  setCityContext,
} from "@/lib/city-domain";
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

function resolveSlugForCity(
  cityId: string,
  catalog: CatalogCity[],
  discovery: AvailableCity[]
) {
  const fromCatalog = catalog.find((city) => city.id === cityId)?.slug;
  if (fromCatalog) return fromCatalog;
  const fromDiscovery = discovery.find((city) => city.id === cityId)?.slug;
  if (fromDiscovery) return fromDiscovery;
  return getSelectedCitySlug();
}

export function AdminCityPicker({ onCityReadyChange }: AdminCityPickerProps) {
  const user = useAuthStore((state) => state.user);
  const selectedCityId = useAuthStore((state) => state.selectedCityId);
  const setAdminCityId = useAuthStore((state) => state.setAdminCityId);
  const setAdminCityContext = useAuthStore((state) => state.setAdminCityContext);
  const isAdmin = isAdminRole(user?.role);
  const usesJwtCity = roleUsesJwtCity(user?.role);

  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [discoveryCities, setDiscoveryCities] = useState<AvailableCity[]>([]);
  const [loading, setLoading] = useState(false);

  const notify = useCallback(
    (ready: boolean, cityId: string | null) => {
      onCityReadyChange?.(ready, cityId);
    },
    [onCityReadyChange]
  );

  const slugById = useMemo(() => {
    const map = new Map<string, string>();
    discoveryCities.forEach((city) => {
      if (city.id && city.slug) map.set(city.id, city.slug);
    });
    cities.forEach((city) => {
      if (city.id && city.slug) map.set(city.id, city.slug);
    });
    return map;
  }, [cities, discoveryCities]);

  // Não-admin: município do JWT / user.
  useEffect(() => {
    if (isAdmin) return;

    const cityId = selectedCityId || user?.city_id || getSelectedCityId() || null;
    if (usesJwtCity && cityId) {
      setCityContext({
        cityId,
        slug: user?.city_slug ?? getSelectedCitySlug() ?? undefined,
      });
      if (cityId !== selectedCityId) {
        setAdminCityId(cityId);
      }
    }
    notify(Boolean(cityId), cityId);
  }, [
    isAdmin,
    notify,
    selectedCityId,
    setAdminCityId,
    user?.city_id,
    user?.city_slug,
    usesJwtCity,
  ]);

  // Admin: carrega catálogo + discovery e herda município do login (uma vez).
  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [catalog, discovery] = await Promise.all([
          listCatalogCities(),
          fetchAvailableCities().catch(() => [] as AvailableCity[]),
        ]);
        if (cancelled) return;

        setCities(catalog);
        setDiscoveryCities(discovery);

        const store = useAuthStore.getState();
        const storedId = store.selectedCityId || getSelectedCityId();
        const storedSlug = store.selectedSlug || getSelectedCitySlug();

        const discoveryMatch =
          discovery.find((city) => city.id === storedId) ||
          discovery.find((city) => city.slug === storedSlug) ||
          null;

        // Prefer id do catálogo (picker); resolve via id, slug ou nome do discovery.
        let nextId =
          (storedId && catalog.some((city) => city.id === storedId) ? storedId : null) ||
          (storedSlug
            ? catalog.find((city) => city.slug === storedSlug)?.id || null
            : null) ||
          (discoveryMatch
            ? catalog.find(
                (city) =>
                  city.id === discoveryMatch.id ||
                  city.slug === discoveryMatch.slug ||
                  city.name.trim().toLowerCase() === discoveryMatch.name.trim().toLowerCase()
              )?.id || null
            : null);

        if (nextId) {
          const slug =
            resolveSlugForCity(nextId, catalog, discovery) ||
            discoveryMatch?.slug ||
            storedSlug ||
            null;
          setAdminCityContext({ cityId: nextId, slug });
          notify(true, nextId);
          return;
        }

        notify(false, null);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Nao foi possivel carregar os municipios."));
          notify(false, null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, notify, setAdminCityContext]);

  useEffect(() => {
    if (!isAdmin) return;
    notify(Boolean(selectedCityId), selectedCityId);
  }, [isAdmin, notify, selectedCityId]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <Label>Municipio</Label>
      <Select
        value={selectedCityId || undefined}
        onValueChange={(value) => {
          const slug = slugById.get(value) || getSelectedCitySlug();
          setAdminCityContext({ cityId: value, slug });
        }}
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
        Contexto do municipio (X-City-ID / X-City-Slug) usado nas rotas tenant.
      </p>
    </div>
  );
}
