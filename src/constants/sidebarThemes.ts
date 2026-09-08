export type SidebarThemeId = "panel";

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
  "--sidebar-user-card-bg": string;
  "--sidebar-user-card-border": string;
  "--sidebar-button-border": string;
  "--sidebar-button-hover-bg": string;
  "--sidebar-button-hover-text": string;
  "--sidebar-focus-ring": string;
}

const panelLight: SidebarThemeVars = {
  "--sidebar-bg": "#ffffff",
  "--sidebar-border": "#ece8f2",
  "--sidebar-icon-bg": "rgba(112, 48, 160, 0.1)",
  "--sidebar-icon-bg-hover": "rgba(112, 48, 160, 0.16)",
  "--sidebar-icon-color": "#7030A0",
  "--sidebar-icon-color-active": "#ffffff",
  "--sidebar-text": "#1e293b",
  "--sidebar-text-muted": "#64748b",
  "--sidebar-link-hover-bg": "rgba(112, 48, 160, 0.06)",
  "--sidebar-link-active-bg": "linear-gradient(90deg, #7030A0, #E53E7F)",
  "--sidebar-link-active-text": "#ffffff",
  "--sidebar-category-text": "#94a3b8",
  "--sidebar-user-card-bg": "#faf8fc",
  "--sidebar-user-card-border": "#ece8f2",
  "--sidebar-button-border": "#ece8f2",
  "--sidebar-button-hover-bg": "rgba(112, 48, 160, 0.06)",
  "--sidebar-button-hover-text": "#7030A0",
  "--sidebar-focus-ring": "rgba(112, 48, 160, 0.35)",
};

export function getSidebarThemeStyles(): SidebarThemeVars {
  return panelLight;
}
