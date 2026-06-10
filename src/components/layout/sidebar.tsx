"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, LogOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { getSidebarThemeStyles } from "@/constants/sidebarThemes";
import { isNavLinkActive, NAV_CATEGORIES, type NavCategory, type NavLink } from "@/config/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  professor: "Professor",
  diretor: "Diretor",
  coordenador: "Coordenador",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CategorySeparator({ name, isCollapsed }: { name: string; isCollapsed: boolean }) {
  if (isCollapsed) return <div className="mx-2 my-2 border-t" style={{ borderColor: "var(--sidebar-border)" }} />;
  return (
    <div className="px-2 pt-1.5 pb-0.5 md:px-3">
      <h3
        className="text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: "var(--sidebar-category-text)" }}
      >
        {name}
      </h3>
    </div>
  );
}

function RenderMenuItem({
  item,
  pathname,
  search,
  onNavigate,
  isCollapsed,
  level = 0,
}: {
  item: NavLink;
  pathname: string;
  search: string;
  onNavigate?: () => void;
  isCollapsed: boolean;
  level?: number;
}) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const active = isNavLinkActive(pathname, search, item.href);
  const childActive = item.children?.some((c) => isNavLinkActive(pathname, search, c.href)) ?? false;
  const isActive = active || childActive;
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  const itemClasses = cn(
    "sidebar-link group relative flex w-full items-center gap-2 transition-all duration-300 ease-out",
    "hover:translate-x-2 active:translate-x-1 active:scale-[0.98]",
    isCollapsed ? "justify-center px-0 py-1" : "rounded-full px-2 py-2 md:px-3 md:py-2.5",
    "hover:!bg-[var(--sidebar-link-hover-bg)]",
    isActive && !isCollapsed && "!bg-[var(--sidebar-link-active-bg)] font-semibold shadow-sm",
    isActive && isCollapsed && "bg-[var(--sidebar-link-hover-bg)]",
    level > 0 && !isCollapsed && "ml-3 text-xs md:ml-4 md:text-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]"
  );

  const content = (
    <div className="flex w-full items-center justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-[var(--sidebar-icon-bg)] transition-all duration-300 group-hover:scale-125 group-hover:bg-[var(--sidebar-icon-bg-hover)]",
            isCollapsed ? "h-10 w-10" : "h-8 w-8 md:h-9 md:w-9"
          )}
        >
          <Icon
            className={cn(
              "shrink-0 transition-all duration-300",
              isCollapsed ? "h-[18px] w-[18px]" : "h-4 w-4 md:h-[18px] md:w-[18px]",
              isActive ? "text-[var(--sidebar-icon-color-active)]" : "text-[var(--sidebar-icon-color)] group-hover:text-[var(--sidebar-icon-color-active)]"
            )}
          />
        </div>
        {!isCollapsed && (
          <span
            className={cn(
              "line-clamp-2 whitespace-normal break-words text-xs font-medium md:text-sm",
              isActive ? "text-[var(--sidebar-link-active-text)]" : "text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-link-active-text)]"
            )}
          >
            {item.label}
          </span>
        )}
      </div>
      {!isCollapsed && hasChildren && (
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-300",
            "text-[var(--sidebar-icon-color)] group-hover:text-[var(--sidebar-icon-color-active)]",
            isOpen && "rotate-180"
          )}
        />
      )}
    </div>
  );

  const wrapped = (
    <Tooltip>
      <TooltipTrigger asChild>
        {hasChildren ? (
          <button type="button" className={itemClasses} onClick={() => setIsOpen((v) => !v)}>
            {content}
          </button>
        ) : (
          <Link href={item.href} onClick={onNavigate} className={itemClasses}>
            {content}
          </Link>
        )}
      </TooltipTrigger>
      {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
    </Tooltip>
  );

  return (
    <li>
      {wrapped}
      {hasChildren && isOpen && !isCollapsed && (
        <ul className="ml-1.5 mt-1 space-y-1 border-l pl-2 md:ml-2 md:pl-3" style={{ borderColor: "var(--sidebar-border)" }}>
          {item.children?.map((child) => {
            const childActive = isNavLinkActive(pathname, search, child.href);
            return (
              <li key={`${item.href}-${child.href}`}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "sidebar-link block rounded-full px-3 py-2 text-xs transition-all duration-300 md:text-sm",
                    "hover:translate-x-1 hover:bg-[var(--sidebar-link-hover-bg)]",
                    childActive && "bg-[var(--sidebar-link-active-bg)] font-semibold text-[var(--sidebar-link-active-text)]"
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ onNavigate, isMobile, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const themeStyles = getSidebarThemeStyles();
  const collapsed = isCollapsed && !isMobile;
  const displayName = user?.name ?? "Usuario";
  const roleLabel = ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "Usuario";

  useEffect(() => {
    if (isMobile) return;
    const stored = localStorage.getItem("sidebar_collapsed");
    if (stored === "true") setIsCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (!isMobile) localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  }

  function handleLogout() {
    logout();
    router.replace("/login");
    onNavigate?.();
  }

  const logoutClasses = cn(
    "sidebar-link group flex w-full items-center gap-2 rounded-full px-2 py-2 transition-all duration-300 md:px-3 md:py-2.5",
    "hover:translate-x-2 hover:!bg-[var(--sidebar-link-hover-bg)]",
    collapsed && "justify-center px-0"
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative z-50 flex h-full min-h-[100dvh] flex-col border-r shadow-xl transition-[width] duration-300",
          isMobile && "animate-sidebar-slide-in w-screen",
          !isMobile && (collapsed ? "w-16" : "w-64 md:w-72")
        )}
        style={{ ...themeStyles, background: "var(--sidebar-bg)" } as CSSProperties}
      >
        <div
          className={cn("shrink-0 p-3", isMobile && "pt-[calc(0.75rem+env(safe-area-inset-top,0px))]", !collapsed && "sm:p-4")}
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
            {!collapsed ? (
              <Image
                src="/AFIRME-PLAY-LOGO-branco.png"
                alt="Afirme Play"
                width={150}
                height={50}
                className="h-8 w-auto object-contain [filter:brightness(0)_saturate(100%)_invert(18%)_sepia(90%)_saturate(1500%)_hue-rotate(205deg)]"
              />
            ) : (
              <button type="button" onClick={toggleCollapsed} className="rounded-full p-1 hover:bg-[var(--sidebar-link-hover-bg)]">
                <Image
                  src="/AFIRME-PLAY-LOGO-branco.png"
                  alt="Afirme Play"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain [filter:brightness(0)_saturate(100%)_invert(18%)_sepia(90%)_saturate(1500%)_hue-rotate(205deg)]"
                />
              </button>
            )}
            {!isMobile && !collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Recolher menu"
                className="rounded-full p-1.5 text-[var(--sidebar-icon-color)] hover:bg-[var(--sidebar-link-hover-bg)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {!collapsed && (
            <Link
              href="/app/perfil"
              onClick={onNavigate}
              className="mt-3 flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-sm"
              style={{
                background: "var(--sidebar-user-card-bg)",
                borderColor: "var(--sidebar-user-card-border)",
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--sidebar-text)" }}>
                  {displayName}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--sidebar-text-muted)" }}>
                  {roleLabel}
                </p>
              </div>
            </Link>
          )}
        </div>

        <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
          {NAV_CATEGORIES.map((category: NavCategory) => (
            <div key={category.label}>
              <CategorySeparator name={category.label} isCollapsed={collapsed} />
              <ul className="space-y-0.5 px-2 md:px-3">
                {category.items.map((item) => (
                  <RenderMenuItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    search={search}
                    onNavigate={onNavigate}
                    isCollapsed={collapsed}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <footer
          className="shrink-0 border-t p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:px-3"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={handleLogout} className={logoutClasses}>
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full bg-[var(--sidebar-icon-bg)] transition-all group-hover:bg-[var(--sidebar-icon-bg-hover)]",
                    collapsed ? "h-10 w-10" : "h-8 w-8"
                  )}
                >
                  <LogOut className="h-4 w-4 text-[var(--sidebar-icon-color)]" />
                </div>
                {!collapsed && (
                  <span className="text-xs font-medium md:text-sm" style={{ color: "var(--sidebar-text)" }}>
                    Sair
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
          </Tooltip>
        </footer>
      </aside>
    </TooltipProvider>
  );
}
