import { BookOpen, Gauge, Settings2, type LucideIcon } from "lucide-react";

export interface AppNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
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
    href: "/app/configuracao-avaliacao",
    label: "Configuracao avaliacao",
    description: "Parametros e configuracoes do sistema de leitura.",
    icon: Settings2,
  },
];
