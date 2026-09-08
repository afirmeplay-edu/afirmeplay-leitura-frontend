import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Gauge,
  Home,
  Layers,
  type LucideIcon,
} from "lucide-react";

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

export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "Principal",
    items: [
      { href: "/app", label: "Inicio", description: "Painel principal do sistema", icon: Home },
    ],
  },
  {
    label: "Avaliacoes",
    items: [
      {
        href: "/app/avaliacao-fluencia",
        label: "Avaliação de Fluência",
        description: "Leiturometro e ICA",
        icon: Gauge,
        children: [
          { href: "/app/avaliacao-fluencia/criar", label: "Criar Avaliação" },
          { href: "/app/avaliacao-fluencia/listar", label: "Listar Avaliação" },
        ],
      },
      {
        href: "/app/avaliacao-leitura-guiada",
        label: "Praticar Avaliação de Fluência",
        description: "Prática das atividades de fluência",
        icon: BookOpen,
        children: [
          { href: "/app/revisao-leitura-guiada", label: "Revisão e áudio" },
          { href: "/app/avaliacao-leitura-guiada?aba=palavras", label: "Praticar palavras conhecidas" },
          {
            href: "/app/avaliacao-leitura-guiada?aba=pouco-comuns",
            label: "Praticar palavras pouco conhecidas",
          },
          { href: "/app/avaliacao-leitura-guiada?aba=texto", label: "Praticar texto" },
        ],
      },
      {
        href: "/app/avaliacoes",
        label: "Avaliacoes aplicadas",
        description: "Provas aplicadas e erros por fase",
        icon: Layers,
      },
      {
        href: "/app/cadastros",
        label: "Cadastros",
        description: "Listas de palavras, textos e perguntas",
        icon: ClipboardList,
        children: [
          {
            href: "/app/cadastros/palavras-conhecidas",
            label: "Lista de palavras conhecidas",
            roles: ["admin"],
          },
          {
            href: "/app/cadastros/palavras-pouco-comuns",
            label: "Lista de palavras pouco comuns",
          },
          {
            href: "/app/cadastros/textos",
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
        href: "/app/relatorios-fluencia",
        label: "Resultados de fluencia",
        description: "IFL, perfis leitores e alertas",
        icon: BarChart3,
      },
      {
        href: "/app/relatorios",
        label: "Relatorios",
        description: "ICA, fluencia e geral",
        icon: BarChart3,
        children: [
          { href: "/app/relatorios?aba=ica", label: "Relatorio ICA" },
          { href: "/app/relatorios?aba=fluencia", label: "Relatorio fluencia" },
          { href: "/app/relatorios?aba=geral", label: "Visao geral" },
        ],
      },
    ],
  },
];

export const DASHBOARD_FEATURE_CARDS = [
  {
    href: "/app/avaliacao-fluencia",
    label: "Aplicar avaliacao",
    description: "Modo leitura sem distração",
    accent: "emerald",
  },
  {
    href: "/app/avaliacao-leitura-guiada",
    label: "Leitura guiada",
    description: "Roteiro de mediação",
    accent: "blue",
  },
  {
    href: "/app/avaliacoes",
    label: "Avaliacoes aplicadas",
    description: "Cards e histórico",
    accent: "amber",
  },
  {
    href: "/app/relatorios-fluencia",
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

export function isNavLinkActive(
  pathname: string,
  search: string,
  href: string,
  options?: { exactPath?: boolean }
): boolean {
  const [path, query] = href.split("?");

  if (path === "/app") return pathname === "/app";

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
