"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { fetchAvailableCities, type AvailableCity } from "@/lib/api/cities";
import { getHostnameSlug, isOnSlugHost, redirectToSlugLogin } from "@/lib/city-domain";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LoginForm() {
  const router = useRouter();
  const [registration, setRegistration] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [cities, setCities] = useState<AvailableCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);

  const selectedCity = useMemo(
    () => cities.find((city) => city.slug === selectedSlug) ?? null,
    [cities, selectedSlug]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      router.replace("/app");
    }
  }, [router, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const preselected = localStorage.getItem("selected_slug");
    const rememberedRegistration = localStorage.getItem("remember_registration");

    if (rememberedRegistration) {
      setRegistration(rememberedRegistration);
      setRemember(true);
    }

    async function loadCities() {
      setLoadingCities(true);
      setCitiesError(null);
      try {
        const data = await fetchAvailableCities();
        if (cancelled) return;
        setCities(data);

        const hostnameSlug = getHostnameSlug();
        if (hostnameSlug && data.some((city) => city.slug === hostnameSlug)) {
          setSelectedSlug(hostnameSlug);
        } else if (preselected && data.some((city) => city.slug === preselected)) {
          setSelectedSlug(preselected);
        } else if (data.length === 1) {
          setSelectedSlug(data[0].slug);
        } else if (data.length === 0) {
          setCitiesError("Nenhum municipio disponivel no momento.");
        }
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 503) {
          setCitiesError("Servico de municipios indisponivel. Inicie o backend local ou tente novamente.");
        } else if (axios.isAxiosError(error) && !error.response) {
          setCitiesError("Backend indisponivel. Inicie o afirmeplay_backend (porta 5000).");
        } else {
          setCitiesError("Nao foi possivel carregar os municipios.");
        }
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    }

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSlug) {
      toast.error("Selecione um municipio para continuar.");
      return;
    }
    if (!registration.trim() || !password.trim()) {
      toast.error("Preencha usuario e senha.");
      return;
    }

    if (!isOnSlugHost(selectedSlug)) {
      redirectToSlugLogin(selectedSlug);
      return;
    }

    const username = registration.trim().split("@")[0].trim();
    const emailCompleto = `${username}@afirmeplay.com.br`;

    try {
      try {
        await login(selectedSlug, emailCompleto, password);
      } catch (firstError: unknown) {
        const status = (firstError as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 404) {
          await login(selectedSlug, username, password);
        } else {
          throw firstError;
        }
      }

      if (remember) {
        localStorage.setItem("remember_registration", username);
      } else {
        localStorage.removeItem("remember_registration");
      }
      toast.success("Login realizado com sucesso.");
      router.replace("/app");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { erro?: string; mensagem?: string } } })?.response?.data?.mensagem ||
        (error as { response?: { data?: { erro?: string } } })?.response?.data?.erro ||
        "Falha no login. Verifique suas credenciais.";
      toast.error(message);
      setPassword("");
    }
  }

  function handleSlugChange(slug: string) {
    setSelectedSlug(slug);
    localStorage.setItem("selected_slug", slug);
    redirectToSlugLogin(slug);
  }

  function handleRegistrationChange(value: string) {
    setRegistration(value.split("@")[0].trim());
  }

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#1E3A8A]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-[#1E3A8A] lg:flex-row">
      <section className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#1E3A8A] to-[#2563EB] p-8 lg:w-1/2 lg:p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-16 top-16 h-64 w-64 rounded-full bg-blue-100 blur-3xl" />
          <div className="absolute bottom-16 right-16 h-72 w-72 rounded-full bg-cyan-200 blur-3xl" />
        </div>
        <div className="relative z-10 text-center text-white">
          <Image
            src="/AFIRME-PLAY-LOGO-branco.png"
            alt="Afirme Play"
            width={280}
            height={95}
            style={{ width: 280, height: "auto" }}
            className="mx-auto max-w-full rounded-xl shadow-2xl"
            priority
          />
          <p className="mt-5 text-lg font-medium text-blue-100">APRENDIZAGEM E RESULTADO</p>
        </div>
      </section>

      <section className="flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md rounded-2xl border border-blue-200/20 bg-gradient-to-br from-[#11306B] to-[#0B2A63] p-8 shadow-2xl">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-3xl font-bold text-white">Bem-vindo</h1>
            <p className="text-sm text-blue-100">Sistema de Leitura Afirme Play</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-blue-100">Usuario</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3.5 z-10 h-4 w-4 text-blue-200" />
                <div className="relative flex items-center">
                  <Input
                    value={registration}
                    onChange={(e) => handleRegistrationChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "@") {
                        e.preventDefault();
                      }
                    }}
                    className="h-12 border-none bg-blue-950/60 pl-10 pr-36 text-white placeholder:text-blue-200/60"
                    placeholder="usuario"
                    disabled={loading}
                  />
                  <span className="pointer-events-none absolute right-4 text-sm text-blue-200/80">
                    @afirmeplay.com.br
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-blue-100">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-blue-200" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-none bg-blue-950/60 pl-10 pr-10 text-white placeholder:text-blue-200/60"
                  placeholder="Digite sua senha"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-blue-200 hover:text-blue-100"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked === true)}
                  id="remember"
                  className="border-blue-200 data-[state=checked]:bg-blue-500"
                />
                <Label htmlFor="remember" className="text-sm text-blue-100">
                  Lembrar-me
                </Label>
              </div>
            </div>

            <Button
              className="h-12 w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-95"
              disabled={loading || loadingCities}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </section>

      <div className="fixed bottom-5 right-5 z-[60] w-[calc(100%-2.5rem)] max-w-xs sm:bottom-6 sm:right-6 sm:w-72">
        <div className="rounded-xl border border-blue-200/25 bg-[#0B2A63]/95 p-3 shadow-2xl backdrop-blur-sm">
          <Label className="mb-2 block text-xs uppercase tracking-wider text-blue-100">Municipio</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-blue-200" />
            <Select
              value={selectedSlug || undefined}
              onValueChange={handleSlugChange}
              disabled={loadingCities || loading || cities.length === 0}
            >
              <SelectTrigger className="h-11 border-none bg-blue-950/70 pl-10 text-white">
                <SelectValue
                  placeholder={
                    loadingCities
                      ? "Carregando..."
                      : citiesError
                        ? "Indisponivel"
                        : "Selecione o municipio"
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.slug}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {citiesError ? (
            <p className="mt-2 text-xs text-red-300">{citiesError}</p>
          ) : selectedCity ? (
            <p className="mt-2 truncate text-xs text-blue-200/90">{selectedCity.name}</p>
          ) : (
            <p className="mt-2 text-xs text-blue-200/70">Escolha o municipio para autenticar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
