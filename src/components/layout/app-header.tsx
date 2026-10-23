"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MapPin, Menu, Settings, UserRound, X } from "lucide-react";
import { ROUTES, SYSTEM_HOME, type AppSystem } from "@/config/routes";
import { isAdminRole } from "@/lib/auth/jwt";
import { getInitials, getRoleLabel } from "@/lib/auth/roles";
import { useAuthStore } from "@/stores/auth-store";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { SystemSwitcher } from "@/components/layout/system-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AppHeaderProps {
  system: AppSystem;
  isMobile: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

export function AppHeader({ system, isMobile, isMenuOpen, onToggleMenu }: AppHeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const selectedSlug = useAuthStore((state) => state.selectedSlug);
  const logout = useAuthStore((state) => state.logout);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);

  const displayName = user?.name ?? "Usuário";
  const roleLabel = getRoleLabel(user?.role);
  const isAdmin = isAdminRole(user?.role);

  function handleLogout() {
    logout();
    router.replace(ROUTES.login);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-0 z-[60] flex h-[calc(4rem+env(safe-area-inset-top,0px))] shrink-0 items-center gap-2 border-b bg-background/85 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md sm:gap-4 sm:px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMenuOpen}
              onClick={onToggleMenu}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          ) : null}
          <Link
            href={SYSTEM_HOME[system]}
            className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ir para o início"
          >
            <Image
              src="/AFIRME-LER-LOGO.png"
              alt="Afirme Ler"
              width={537}
              height={249}
              className="h-10 w-auto max-w-[120px] object-contain sm:h-12 sm:max-w-[180px]"
              unoptimized
              priority
            />
          </Link>
        </div>

        <SystemSwitcher active={system} compact={isMobile} />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          {isAdmin ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 px-2 sm:px-3"
                  onClick={() => setCityDialogOpen(true)}
                  aria-label="Trocar município"
                >
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--system-text)" }} />
                  <span className="hidden max-w-[140px] truncate text-sm lg:inline">
                    {selectedSlug || "Município"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Município (contexto do administrador)</TooltipContent>
            </Tooltip>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden h-10 w-10 sm:inline-flex" asChild>
                <Link href={ROUTES.perfil} aria-label="Configurações">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Configurações</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-full pl-1 pr-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:pr-3"
                aria-label={`Menu do usuário: ${displayName}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-xs font-bold text-white"
                    style={{ background: "var(--system-gradient)" }}
                  >
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block max-w-[160px] truncate text-sm font-semibold leading-tight">
                    {displayName}
                  </span>
                  <span className="block max-w-[160px] truncate text-xs leading-tight text-muted-foreground">
                    {roleLabel}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[70] w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={ROUTES.perfil}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Meu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-700 focus:bg-red-50 focus:text-red-800"
                onSelect={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isAdmin ? (
        <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Município</DialogTitle>
              <DialogDescription>
                Define o município usado nas consultas das duas áreas (Leitura e ICA).
              </DialogDescription>
            </DialogHeader>
            <AdminCityPicker />
          </DialogContent>
        </Dialog>
      ) : null}
    </TooltipProvider>
  );
}
