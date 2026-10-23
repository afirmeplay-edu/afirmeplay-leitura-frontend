import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Gauge,
  Home,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, SYSTEM_HOME, type AppSystem } from "@/config/routes";

export { getSystemFromPathname } from "@/config/routes";

export interface NavChildLink {
  href: string;
  label: string;
  roles?: string[];
}

export interface NavLink {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  roles?: string[];
  children?: NavChildLink[];
  /** Item visível mas não clicável (ex.: "Em breve"); `href` serve só como chave. */
  disabled?: boolean;
  badge?: string;
}

export interface NavCategory {
  label: string;
  items: NavLink[];
}

export type ShortcutAccent = "purple" | "blue" | "emerald" | "amber" | "green" | "orange" | "teal";

export interface DashboardShortcut {
  href: string;
  label: string;
  description: string;
  accent: ShortcutAccent;
  icon: LucideIcon;
}

const L = ROUTES.leitura;
const I = ROUTES.ica;

export const NAV_LEITURA: NavCategory[] = [
  {
    label: "Principal",
    items: [
      { href: L.home, label: "Inicio", description: "Painel principal do sistema", icon: Home },
    ],
  },
  {
    label: "Avaliacoes",
    items: [
      {
        href: L.fluencia.selecao,
        label: "Avaliação de Fluência",
        description: "Leiturometro e ICA",
        icon: Gauge,
        children: [
          { href: L.fluencia.criar, label: "Criar Avaliação" },
          { href: L.fluencia.listar, label: "Listar Avaliação" },
        ],
      },
      {
        href: L.pratica.root,
        label: "Praticar Avaliação de Fluência",
        description: "Prática das atividades de fluência",
        icon: BookOpen,
        children: [
          { href: L.revisao, label: "Revisão e áudio" },
          { href: `${L.pratica.root}?aba=palavras`, label: "Praticar palavras conhecidas" },
          {
            href: `${L.pratica.root}?aba=pouco-comuns`,
            label: "Praticar palavras pouco conhecidas",
          },
          { href: `${L.pratica.root}?aba=texto`, label: "Praticar texto" },
        ],
      },
      {
        href: L.avaliacoes.root,
        label: "Avaliacoes aplicadas",
        description: "Provas aplicadas e erros por fase",
        icon: Layers,
      },
      {
        href: L.cadastros.root,
        label: "Cadastros",
        description: "Listas de palavras, textos e perguntas",
        icon: ClipboardList,
        children: [
          {
            href: L.cadastros.conhecidas,
            label: "Lista de palavras conhecidas",
            roles: ["admin"],
          },
          {
            href: L.cadastros.poucoComuns,
            label: "Lista de palavras pouco comuns",
          },
          {
            href: L.cadastros.textos,
            label: "Criar textos e perguntas",
          },
        ],
      },
    ],
  },
  {
    label: "Relatorios",
    items: [
      {
        href: L.relatoriosFluencia,
        label: "Resultados de fluencia",
        description: "IFL, perfis leitores e alertas",
        icon: BarChart3,
      },
      {
        href: L.relatorios,
        label: "Relatorios",
        description: "ICA, fluencia e geral",
        icon: BarChart3,
        children: [
          { href: `${L.relatorios}?aba=ica`, label: "Relatorio ICA" },
          { href: `${L.relatorios}?aba=fluencia`, label: "Relatorio fluencia" },
          { href: `${L.relatorios}?aba=geral`, label: "Visao geral" },
        ],
      },
    ],
  },
];

export const NAV_ICA: NavCategory[] = [
  {
    label: "Principal",
    items: [{ href: I.home, label: "Início", description: "Painel do Sistema ICA", icon: Home }],
  },
];

const NAV_BY_SYSTEM: Record<AppSystem, NavCategory[]> = {
  leitura: NAV_LEITURA,
  ica: NAV_ICA,
};

export function getNavForSystem(system: AppSystem): NavCategory[] {
  return NAV_BY_SYSTEM[system];
}

export const DASHBOARD_SHORTCUTS: Record<AppSystem, DashboardShortcut[]> = {
  leitura: [
    {
      href: L.fluencia.selecao,
      label: "Aplicar avaliacao",
      description: "Modo leitura sem distração",
      accent: "emerald",
      icon: Gauge,
    },
    {
      href: L.pratica.root,
      label: "Leitura guiada",
      description: "Roteiro de mediação",
      accent: "blue",
      icon: BookOpen,
    },
    {
      href: L.avaliacoes.root,
      label: "Avaliacoes aplicadas",
      description: "Cards e histórico",
      accent: "amber",
      icon: Layers,
    },
    {
      href: L.relatoriosFluencia,
      label: "Relatorios",
      description: "Alfabetômetro e exportações",
      accent: "purple",
      icon: BarChart3,
    },
  ],
  ica: [],
};

export function canAccessByRoles(role: string | null | undefined, roles?: string[]) {
  if (!roles?.length) return true;
  const normalized = (role ?? "").trim().toLowerCase();
  return roles.some((allowed) => allowed.toLowerCase() === normalized);
}

export function filterNavCategoriesByRole(
  categories: NavCategory[],
  role: string | null | undefined
): NavCategory[] {
  return categories
    .map((category) => ({
      ...category,
      items: category.items
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => canAccessByRoles(role, child.roles)),
        }))
        .filter((item) => canAccessByRoles(role, item.roles)),
    }))
    .filter((category) => category.items.length > 0);
}

const EXACT_MATCH_PATHS = new Set<string>([ROUTES.app, ...Object.values(SYSTEM_HOME)]);

export function isNavLinkActive(
  pathname: string,
  search: string,
  href: string,
  options?: { exactPath?: boolean }
): boolean {
  const [path, query] = href.split("?");

  if (EXACT_MATCH_PATHS.has(path)) return pathname === path;

  const pathMatch = options?.exactPath
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);

  if (!query) return pathMatch;

  if (!pathMatch) return false;

  const hrefParams = new URLSearchParams(query);
  const currentParams = new URLSearchParams(search);

  for (const [key, value] of hrefParams.entries()) {
    if (currentParams.get(key) !== value) return false;
  }

  return true;
}
