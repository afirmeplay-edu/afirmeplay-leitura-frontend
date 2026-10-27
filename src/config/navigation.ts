import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  Home,
  Layers,
  Library,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, SYSTEM_HOME, type AppSystem } from "@/config/routes";
import { ICA_WRITE_ROLES } from "@/lib/auth/roles";

export { getSystemFromPathname } from "@/config/routes";

export interface NavChildLink {
  href: string;
  label: string;
  roles?: string[];
  /** Ativo só no path exato (necessário quando o filho aponta para o mesmo path do pai). */
  exact?: boolean;
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
  disabled?: boolean;
  badge?: string;
}

const L = ROUTES.leitura;
const I = ROUTES.ica;

export const NAV_LEITURA: NavCategory[] = [
  {
    label: "Principal",
    items: [
      { href: L.home, label: "Início", description: "Painel principal do sistema", icon: Home },
    ],
  },
  {
    label: "Avaliações",
    items: [
      {
        href: L.fluencia.selecao,
        label: "Avaliar",
        description: "Leiturômetro",
        icon: Gauge,
        children: [
          { href: L.fluencia.criar, label: "Criar avaliação" },
          { href: L.fluencia.listar, label: "Avaliações criadas" },
          { href: L.fluencia.selecao, label: "Aplicar", exact: true },
        ],
      },
      {
        href: L.pratica.root,
        label: "Praticar",
        description: "Prática das atividades de fluência",
        icon: BookOpen,
        children: [
          { href: `${L.pratica.root}?aba=palavras`, label: "Palavras conhecidas" },
          { href: `${L.pratica.root}?aba=pouco-comuns`, label: "Palavras pouco comuns" },
          { href: `${L.pratica.root}?aba=texto`, label: "Texto" },
          { href: L.automatica.root, label: "Leitura automática" },
          { href: L.revisao, label: "Revisão e áudio" },
        ],
      },
      {
        href: L.cadastros.root,
        label: "Cadastros",
        description: "Listas de palavras, textos e perguntas",
        icon: ClipboardList,
        children: [
          { href: L.cadastros.conhecidas, label: "Palavras conhecidas", roles: ["admin"] },
          { href: L.cadastros.poucoComuns, label: "Palavras pouco comuns" },
          { href: L.cadastros.textos, label: "Textos e perguntas" },
        ],
      },
    ],
  },
  {
    label: "Relatórios",
    items: [
      {
        href: L.relatorios,
        label: "Resultados",
        description: "IFL, perfis leitores e provas aplicadas",
        icon: BarChart3,
        children: [
          { href: L.relatorios, label: "Painel de resultados", exact: true },
          { href: L.relatoriosFluencia, label: "Relatório de fluência" },
          { href: L.avaliacoes.root, label: "Avaliações aplicadas" },
        ],
      },
    ],
  },
];

const WRITE_ROLES = [...ICA_WRITE_ROLES];

export const NAV_ICA: NavCategory[] = [
  {
    label: "Principal",
    items: [{ href: I.home, label: "Início", description: "Painel do Sistema ICA", icon: Home }],
  },
  {
    label: "Conteúdo",
    items: [
      {
        href: I.questoes.root,
        label: "Banco de questões",
        description: "Múltipla escolha, ditado e produção",
        icon: Library,
        children: [
          { href: I.questoes.nova, label: "Criar questão", roles: WRITE_ROLES },
          { href: I.questoes.root, label: "Listar questões", exact: true },
        ],
      },
      {
        href: I.avaliacoes.root,
        label: "Avaliações",
        description: "Montagem da prova",
        icon: ClipboardCheck,
        children: [
          { href: I.avaliacoes.nova, label: "Criar avaliação", roles: WRITE_ROLES },
          { href: I.avaliacoes.root, label: "Listar avaliações", exact: true },
        ],
      },
    ],
  },
  {
    label: "Acompanhamento",
    items: [
      {
        href: I.aplicacao,
        label: "Aplicação e correção",
        description: "Turmas e cartões-resposta",
        icon: ScanLine,
      },
      {
        href: I.acompanhamento,
        label: "Acompanhamento",
        description: "Banco, avaliações e turmas",
        icon: BarChart3,
      },
      {
        href: `${I.home}#resultados`,
        label: "Resultados",
        description: "Desempenho por turma",
        icon: BarChart3,
        disabled: true,
        badge: "Em breve",
      },
    ],
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
      label: "Aplicar avaliação",
      description: "Modo leitura sem distração",
      accent: "emerald",
      icon: Gauge,
    },
    {
      href: L.pratica.root,
      label: "Praticar leitura",
      description: "Palavras e texto, sem registro oficial",
      accent: "blue",
      icon: BookOpen,
    },
    {
      href: L.avaliacoes.root,
      label: "Avaliações aplicadas",
      description: "Cards e histórico",
      accent: "amber",
      icon: Layers,
    },
    {
      href: L.relatorios,
      label: "Resultados",
      description: "Painel, evolução no ano e turmas",
      accent: "purple",
      icon: BarChart3,
    },
  ],
  ica: [
    {
      href: I.questoes.root,
      label: "Questões",
      description: "Múltipla escolha, ditado e produção escrita",
      accent: "teal",
      icon: Library,
    },
    {
      href: I.avaliacoes.root,
      label: "Avaliações",
      description: "Monte a prova com 20 itens",
      accent: "blue",
      icon: ClipboardCheck,
    },
    {
      href: I.aplicacao,
      label: "Aplicação e correção",
      description: "Turmas e cartões-resposta · correção em breve",
      accent: "teal",
      icon: ScanLine,
    },
    {
      href: I.acompanhamento,
      label: "Acompanhamento",
      description: "Banco, avaliações e turmas",
      accent: "purple",
      icon: BarChart3,
    },
  ],
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
