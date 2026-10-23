"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getSidebarThemeStyles } from "@/constants/sidebarThemes";
import { isNavLinkActive, type NavCategory, type NavChildLink, type NavLink } from "@/config/navigation";
import type { AppSystem } from "@/config/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function resolveChildHref(childHref: string, pathname: string, search: string) {
  const [path, query] = childHref.split("?");
  if (!query || path !== pathname) return childHref;

  const childParams = new URLSearchParams(query);
  const aba = childParams.get("aba");
  if (!aba) return childHref;

  const current = new URLSearchParams(search);
  current.set("aba", aba);
  const next = current.toString();
  return next ? `${path}?${next}` : path;
}

function isChildActive(pathname: string, search: string, child: NavChildLink) {
  return isNavLinkActive(pathname, search, child.href, {
    exactPath: child.exact || child.href.includes("?"),
  });
}

function isItemActive(item: NavLink, pathname: string, search: string) {
  if (item.disabled) return false;
  if (isNavLinkActive(pathname, search, item.href)) return true;
  return item.children?.some((child) => isChildActive(pathname, search, child)) ?? false;
}

interface SidebarProps {
  categories: NavCategory[];
  system: AppSystem;
  onNavigate?: () => void;
  isMobile?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function CategorySeparator({ name, isCollapsed }: { name: string; isCollapsed: boolean }) {
  if (isCollapsed) return <div className="mx-2 my-2 border-t" style={{ borderColor: "var(--sidebar-border)" }} />;
  return (
    <div className="px-2 pt-1.5 pb-0.5 md:px-3">
      <h3
        className="text-left text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: "var(--sidebar-category-text)" }}
      >
        {name}
      </h3>
    </div>
  );
}

function ItemContent({
  item,
  isActive,
  isCollapsed,
  trailing,
}: {
  item: NavLink;
  isActive: boolean;
  isCollapsed: boolean;
  trailing?: ReactNode;
}) {
  const Icon = item.icon;
  const description = item.description?.trim() ?? "";
  /** Descrições longas ficam ocultas e expandem abaixo no hover (sem reticências). */
  const isLongDescription = description.length > 28;
  const descriptionClass = cn(
    "text-left text-[11px] leading-snug",
    isActive ? "text-white/80" : "text-[var(--sidebar-text-muted)]"
  );

  return (
    <div className="flex w-full items-center justify-between gap-1">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-icon-bg)] transition-all duration-300",
            !item.disabled && "group-hover:scale-110 group-hover:bg-[var(--sidebar-icon-bg-hover)]",
            isCollapsed ? "h-10 w-10" : "h-8 w-8 md:h-9 md:w-9",
            isActive && "bg-white/20 group-hover:bg-white/25"
          )}
        >
          <Icon
            className={cn(
              "shrink-0 transition-colors duration-300",
              isCollapsed ? "h-[18px] w-[18px]" : "h-4 w-4 md:h-[18px] md:w-[18px]",
              isActive ? "text-white" : "text-[var(--sidebar-icon-color)]"
            )}
            aria-hidden
          />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1 text-left">
            <span
              className={cn(
                "flex items-center gap-2 text-left text-xs font-semibold leading-snug md:text-sm",
                isActive ? "text-white" : "text-[var(--sidebar-text)]"
              )}
            >
              <span className="min-w-0">{item.label}</span>
              {item.badge ? (
                <span className="shrink-0 rounded-full bg-[var(--sidebar-icon-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--sidebar-icon-color)]">
                  {item.badge}
                </span>
              ) : null}
            </span>
            {description ? (
              isLongDescription ? (
                <div className="sidebar-desc-hover">
                  <span>
                    <span className={cn("block", descriptionClass)}>{description}</span>
                  </span>
                </div>
              ) : (
                <span className={cn("mt-0.5 block", descriptionClass)}>{description}</span>
              )
            ) : null}
          </div>
        )}
      </div>
      {!isCollapsed ? trailing : null}
    </div>
  );
}

function itemClasses(isActive: boolean, isCollapsed: boolean, disabled?: boolean) {
  return cn(
    "sidebar-link group relative flex w-full items-center gap-2 text-left transition-all duration-200 ease-out",
    isCollapsed ? "justify-center rounded-2xl px-0 py-1" : "min-h-10 rounded-2xl px-2 py-2 md:px-3 md:py-2.5",
    disabled
      ? "cursor-not-allowed opacity-60"
      : cn(
          "hover:translate-x-1 active:scale-[0.98]",
          !isActive && "hover:!bg-[var(--sidebar-link-hover-bg)]"
        ),
    isActive && "font-semibold shadow-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]"
  );
}

const activeStyle: CSSProperties = { background: "var(--sidebar-link-active-bg)" };

function MenuItem({
  item,
  pathname,
  search,
  onNavigate,
  isCollapsed,
}: {
  item: NavLink;
  pathname: string;
  search: string;
  onNavigate?: () => void;
  isCollapsed: boolean;
}) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = isItemActive(item, pathname, search);
  const selfActive = !item.disabled && isNavLinkActive(pathname, search, item.href);
  const tooltip = item.description ? `${item.label} — ${item.description}` : item.label;

  if (item.disabled) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="link"
              aria-disabled="true"
              aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
              tabIndex={0}
              className={itemClasses(false, isCollapsed, true)}
            >
              <ItemContent item={item} isActive={false} isCollapsed={isCollapsed} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.badge ? `${item.label} · ${item.badge}` : item.label}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  if (hasChildren && isCollapsed) {
    return (
      <li>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={itemClasses(isActive, true)}
                  style={isActive ? activeStyle : undefined}
                  aria-label={item.label}
                >
                  <ItemContent item={item} isActive={isActive} isCollapsed />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{tooltip}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="z-[80] w-60">
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.children?.map((child) => {
              const childActive = isChildActive(pathname, search, child);
              return (
                <DropdownMenuItem key={child.href} asChild className="cursor-pointer">
                  <Link
                    href={resolveChildHref(child.href, pathname, search)}
                    onClick={onNavigate}
                    aria-current={childActive ? "page" : undefined}
                    className={cn(childActive && "font-semibold text-[var(--sidebar-icon-color)]")}
                  >
                    {child.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  }

  if (hasChildren) {
    return (
      <AccordionPrimitive.Item value={item.href} asChild>
        <li>
          <AccordionPrimitive.Header asChild>
            <div>
              <AccordionPrimitive.Trigger
                className={itemClasses(isActive, false)}
                style={isActive ? activeStyle : undefined}
              >
                <ItemContent
                  item={item}
                  isActive={isActive}
                  isCollapsed={false}
                  trailing={
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180",
                        isActive ? "text-white" : "text-[var(--sidebar-icon-color)]"
                      )}
                    />
                  }
                />
              </AccordionPrimitive.Trigger>
            </div>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <ul
              className="ml-1.5 mt-1 space-y-1 border-l pb-1 pl-2 md:ml-2 md:pl-3"
              style={{ borderColor: "var(--sidebar-border)" }}
            >
              {item.children?.map((child) => {
                const childActive = isChildActive(pathname, search, child);
                return (
                  <li key={`${item.href}-${child.href}`}>
                    <Link
                      href={resolveChildHref(child.href, pathname, search)}
                      onClick={onNavigate}
                      aria-current={childActive ? "page" : undefined}
                      className={cn(
                        "sidebar-link flex min-h-10 items-center rounded-xl px-3 py-2 text-xs transition-all duration-200 md:text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]",
                        !childActive && "hover:translate-x-1 hover:bg-[var(--sidebar-link-hover-bg)]",
                        childActive && "font-semibold text-white"
                      )}
                      style={childActive ? activeStyle : undefined}
                    >
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </AccordionPrimitive.Content>
        </li>
      </AccordionPrimitive.Item>
    );
  }

  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={selfActive ? "page" : undefined}
            aria-label={isCollapsed ? item.label : undefined}
            className={itemClasses(isActive, isCollapsed)}
            style={isActive ? activeStyle : undefined}
          >
            <ItemContent item={item} isActive={isActive} isCollapsed={isCollapsed} />
          </Link>
        </TooltipTrigger>
        {isCollapsed ? <TooltipContent side="right">{tooltip}</TooltipContent> : null}
      </Tooltip>
    </li>
  );
}

function CategoryList({
  category,
  pathname,
  search,
  onNavigate,
  isCollapsed,
}: {
  category: NavCategory;
  pathname: string;
  search: string;
  onNavigate?: () => void;
  isCollapsed: boolean;
}) {
  const activeGroups = useMemo(
    () =>
      category.items
        .filter((item) => item.children?.length && isItemActive(item, pathname, search))
        .map((item) => item.href),
    [category.items, pathname, search]
  );
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroups);
  const activeKey = activeGroups.join("|");

  useEffect(() => {
    if (!activeKey) return;
    setOpenGroups((prev) => {
      const missing = activeKey.split("|").filter((href) => !prev.includes(href));
      return missing.length ? [...prev, ...missing] : prev;
    });
  }, [activeKey]);

  const items = category.items.map((item) => (
    <MenuItem
      key={item.href}
      item={item}
      pathname={pathname}
      search={search}
      onNavigate={onNavigate}
      isCollapsed={isCollapsed}
    />
  ));

  return (
    <div>
      <CategorySeparator name={category.label} isCollapsed={isCollapsed} />
      {isCollapsed ? (
        <ul className="space-y-0.5 px-2 md:px-3">{items}</ul>
      ) : (
        <AccordionPrimitive.Root type="multiple" value={openGroups} onValueChange={setOpenGroups} asChild>
          <ul className="space-y-0.5 px-2 md:px-3">{items}</ul>
        </AccordionPrimitive.Root>
      )}
    </div>
  );
}

export function Sidebar({ categories, system, onNavigate, isMobile, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const themeStyles = getSidebarThemeStyles();
  const collapsed = isCollapsed && !isMobile;

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

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative z-50 flex h-full flex-col border-r shadow-xl transition-[width] duration-300 md:shadow-none",
          isMobile && "animate-sidebar-slide-in w-screen",
          !isMobile && (collapsed ? "w-16" : "w-64 md:w-72")
        )}
        style={{ ...themeStyles, background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" } as CSSProperties}
        aria-label="Menu principal"
      >
        {!isMobile && (
          <div className={cn("flex shrink-0 px-2 pt-2", collapsed ? "justify-center" : "justify-end md:px-3")}>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-expanded={!collapsed}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--sidebar-icon-color)] transition-colors hover:bg-[var(--sidebar-link-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        )}

        <nav
          key={system}
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 animate-in fade-in-0 slide-in-from-left-2 duration-200"
        >
          {categories.map((category) => (
            <CategoryList
              key={category.label}
              category={category}
              pathname={pathname}
              search={search}
              onNavigate={onNavigate}
              isCollapsed={collapsed}
            />
          ))}
        </nav>

        <footer
          className="shrink-0 border-t p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:px-3"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <p
            className={cn(
              "px-2 text-[10px] leading-tight text-muted-foreground md:px-3",
              collapsed ? "px-0 text-center" : "text-left"
            )}
          >
            {collapsed ? "© 2026" : "© 2026 Afirme Ler"}
          </p>
        </footer>
      </aside>
    </TooltipProvider>
  );
}
