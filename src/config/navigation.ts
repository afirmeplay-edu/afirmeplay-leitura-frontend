import { BookOpen, ClipboardList, Gauge, Settings2, type LucideIcon } from "lucide-react";

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

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/app/avaliacao-fluencia",
    label: "Avaliacao fluencia",
    description: "Area dedicada ao acompanhamento da fluencia dos estudantes.",
    icon: Gauge,
  },
  {
    href: "/app/avaliacao-leitura-guiada",
    label: "Avaliacao leitura guiada",
    description: "Fluxo da leitura guiada e consolidacao de evidencias.",
    icon: BookOpen,
  },
  {
    href: "/app/revisao-leitura-guiada",
    label: "Revisao leitura guiada",
    description: "Alunos que ja realizaram a avaliacao, erros e audio.",
    icon: ClipboardList,
  },
  {
    href: "/app/configuracao-avaliacao",
    label: "Configurar avaliacao",
    description: "Cadastro de listas de palavras e textos de leitura.",
    icon: Settings2,
  },
];
