import {
  BarChart3,
  BookOpen,
  Gauge,
  Home,
  Layers,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export interface NavChildLink {
  href: string;
  label: string;
}

export interface NavLink {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
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
        label: "Avaliacao de fluencia",
        description: "Leiturometro e ICA",
        icon: Gauge,
      },
      {
        href: "/app/avaliacao-leitura-guiada",
        label: "Leitura guiada",
        description: "Fluxo de leitura guiada",
        icon: BookOpen,
        children: [
          { href: "/app/avaliacao-leitura-guiada", label: "Nova avaliacao" },
          { href: "/app/revisao-leitura-guiada", label: "Revisao e audio" },
          { href: "/app/avaliacao-leitura-guiada/demo", label: "Modo demonstracao" },
        ],
      },
      {
        href: "/app/avaliacoes",
        label: "Avaliacoes aplicadas",
        description: "Historico de avaliacoes",
        icon: Layers,
        children: [{ href: "/app/avaliacoes/nova", label: "Registrar avaliacao" }],
      },
      {
        href: "/app/configuracao-avaliacao",
        label: "Configurar avaliacao",
        description: "Listas e textos ICA",
        icon: Settings2,
      },
    ],
  },
  {
    label: "Relatorios",
    items: [
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
    label: "Avaliacao de Fluencia Leitora",
    badge: "Leiturometro · ICA",
    description:
      "Aplicacao individual com correcao automatica por IA: listas de palavras, pseudopalavras e leitura de texto narrativo.",
    accent: "emerald",
  },
  {
    href: "/app/configuracao-avaliacao",
    label: "Configurar Avaliacao",
    description:
      "Cadastre listas de palavras, textos narrativos e perguntas de compreensao personalizadas.",
    accent: "amber",
  },
  {
    href: "/app/avaliacao-leitura-guiada",
    label: "Avaliacao de Leitura Guiada",
    description:
      "Fluxo livre de avaliacao: selecione um aluno e um texto para iniciar uma sessao de leitura guiada.",
    accent: "blue",
  },
  {
    href: "/app/revisao-leitura-guiada",
    label: "Revisao Leitura Guiada",
    description: "Alunos que ja realizaram a avaliacao, erros de compreensao e audio.",
    accent: "purple",
  },
  {
    href: "/app/relatorios?aba=ica",
    label: "Relatorios ICA",
    description:
      "Graficos, tabelas e parecer tecnico-pedagogico com base no Indice Crianca Alfabetizada.",
    accent: "green",
  },
] as const;

export function getAllNavLinks(): NavLink[] {
  return NAV_CATEGORIES.flatMap((c) => c.items);
}

export function isNavLinkActive(pathname: string, search: string, href: string): boolean {
  const [path, query] = href.split("?");

  if (path === "/app") return pathname === "/app";

  const pathMatch = pathname === path || pathname.startsWith(`${path}/`);

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
