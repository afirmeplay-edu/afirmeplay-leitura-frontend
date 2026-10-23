export interface SidebarThemeVars {
  "--sidebar-bg": string;
  "--sidebar-border": string;
  "--sidebar-icon-bg": string;
  "--sidebar-icon-bg-hover": string;
  "--sidebar-icon-color": string;
  "--sidebar-icon-color-active": string;
  "--sidebar-text": string;
  "--sidebar-text-muted": string;
  "--sidebar-link-hover-bg": string;
  "--sidebar-link-active-bg": string;
  "--sidebar-link-active-text": string;
  "--sidebar-category-text": string;
  "--sidebar-focus-ring": string;
}

/** Cores de acento vêm de `--system-*` (definidas por `data-system` no shell), então a sidebar segue o sistema ativo. */
const panelLight: SidebarThemeVars = {
  "--sidebar-bg": "#ffffff",
  "--sidebar-border": "color-mix(in srgb, var(--system-text) 12%, #ffffff)",
  "--sidebar-icon-bg": "var(--system-soft)",
  "--sidebar-icon-bg-hover": "color-mix(in srgb, var(--system-text) 16%, transparent)",
  "--sidebar-icon-color": "var(--system-text)",
  "--sidebar-icon-color-active": "#ffffff",
  "--sidebar-text": "#1e293b",
  "--sidebar-text-muted": "#64748b",
  "--sidebar-link-hover-bg": "color-mix(in srgb, var(--system-text) 6%, transparent)",
  "--sidebar-link-active-bg": "var(--system-gradient)",
  "--sidebar-link-active-text": "#ffffff",
  "--sidebar-category-text": "#94a3b8",
  "--sidebar-focus-ring": "color-mix(in srgb, var(--system-text) 35%, transparent)",
};

export function getSidebarThemeStyles(): SidebarThemeVars {
  return panelLight;
}
