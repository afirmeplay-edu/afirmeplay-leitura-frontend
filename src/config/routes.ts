export type AppSystem = "leitura" | "ica";

export const APP_SYSTEMS: AppSystem[] = ["leitura", "ica"];

const LEITURA = "/app/leitura";
const ICA = "/app/ica";

export const ROUTES = {
  app: "/app",
  login: "/login",
  perfil: "/app/perfil",
  leitura: {
    home: LEITURA,
    fluencia: {
      selecao: `${LEITURA}/avaliacao-fluencia`,
      criar: `${LEITURA}/avaliacao-fluencia/criar`,
      listar: `${LEITURA}/avaliacao-fluencia/listar`,
      aplicar: `${LEITURA}/avaliacao-fluencia/aplicar`,
    },
    pratica: {
      root: `${LEITURA}/avaliacao-leitura-guiada`,
      demo: `${LEITURA}/avaliacao-leitura-guiada/demo`,
      sessao: `${LEITURA}/avaliacao-leitura-guiada/sessao`,
    },
    revisao: `${LEITURA}/revisao-leitura-guiada`,
    automatica: {
      root: `${LEITURA}/leitura-automatica`,
      nova: `${LEITURA}/leitura-automatica/nova`,
      detalhe: (id: string) => `${LEITURA}/leitura-automatica/${id}`,
    },
    avaliacoes: {
      root: `${LEITURA}/avaliacoes`,
      detalhe: (id: string) => `${LEITURA}/avaliacoes/${id}`,
      aluno: (id: string, studentId: string) => `${LEITURA}/avaliacoes/${id}/aluno/${studentId}`,
    },
    cadastros: {
      root: `${LEITURA}/cadastros`,
      conhecidas: `${LEITURA}/cadastros/palavras-conhecidas`,
      poucoComuns: `${LEITURA}/cadastros/palavras-pouco-comuns`,
      textos: `${LEITURA}/cadastros/textos`,
    },
    relatorios: `${LEITURA}/relatorios`,
    relatoriosFluencia: `${LEITURA}/relatorios-fluencia`,
    configuracaoAvaliacao: `${LEITURA}/configuracao-avaliacao`,
  },
  ica: {
    home: ICA,
    questoes: {
      root: `${ICA}/questoes`,
      nova: `${ICA}/questoes/nova`,
      detalhe: (id: string) => `${ICA}/questoes/${id}`,
    },
    avaliacoes: {
      root: `${ICA}/avaliacoes`,
      nova: `${ICA}/avaliacoes/nova`,
      detalhe: (id: string) => `${ICA}/avaliacoes/${id}`,
      aplicacao: (id: string) => `${ICA}/avaliacoes/${id}/aplicacao`,
    },
    aplicacao: `${ICA}/aplicacao`,
    acompanhamento: `${ICA}/acompanhamento`,
  },
} as const;

export const SYSTEM_HOME: Record<AppSystem, string> = {
  leitura: ROUTES.leitura.home,
  ica: ROUTES.ica.home,
};

export const SYSTEM_LABEL: Record<AppSystem, string> = {
  leitura: "Leitura",
  ica: "ICA",
};

const LAST_SYSTEM_KEY = "last_system";

export function isAppSystem(value: unknown): value is AppSystem {
  return value === "leitura" || value === "ica";
}

/** `null` para rotas neutras (`/app`, `/app/perfil`) e fora de `/app`. */
export function getSystemFromPathname(pathname: string | null | undefined): AppSystem | null {
  if (!pathname) return null;
  for (const system of APP_SYSTEMS) {
    const home = SYSTEM_HOME[system];
    if (pathname === home || pathname.startsWith(`${home}/`)) return system;
  }
  return null;
}

export function readLastSystem(): AppSystem {
  if (typeof window === "undefined") return "leitura";
  const stored = window.localStorage.getItem(LAST_SYSTEM_KEY);
  return isAppSystem(stored) ? stored : "leitura";
}

export function writeLastSystem(system: AppSystem) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SYSTEM_KEY, system);
}
