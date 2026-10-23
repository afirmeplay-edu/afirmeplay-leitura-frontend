import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Gauge,
  Home,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, SYSTEM_HOME } from "@/config/routes";

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
}

export interface NavCategory {
  label: string;
  items: NavLink[];
}

const L = ROUTES.leitura;

export const NAV_CATEGORIES: NavCategory[] = [
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

export const DASHBOARD_FEATURE_CARDS = [
  {
    href: L.fluencia.selecao,
    label: "Aplicar avaliacao",
    description: "Modo leitura sem distração",
    accent: "emerald",
  },
  {
    href: L.pratica.root,
    label: "Leitura guiada",
    description: "Roteiro de mediação",
    accent: "blue",
  },
  {
    href: L.avaliacoes.root,
    label: "Avaliacoes aplicadas",
    description: "Cards e histórico",
    accent: "amber",
  },
  {
    href: L.relatoriosFluencia,
    label: "Relatorios",
    description: "Alfabetômetro e exportações",
    accent: "purple",
  },
] as const;

export function getAllNavLinks(): NavLink[] {
  return NAV_CATEGORIES.flatMap((c) => c.items);
}

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

// Mantido para compatibilidade com referencias legadas.
export type AppNavItem = NavLink;
export const APP_NAV_ITEMS: AppNavItem[] = getAllNavLinks();
