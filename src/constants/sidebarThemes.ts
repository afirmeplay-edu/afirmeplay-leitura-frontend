export type SidebarThemeId = "blue";

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

const blueLight: SidebarThemeVars = {
  "--sidebar-bg": "linear-gradient(to bottom, #93c5fd, #bfdbfe, #dbeafe, #eff6ff)",
  "--sidebar-border": "#93c5fd",
  "--sidebar-icon-bg": "#bfdbfe",
  "--sidebar-icon-bg-hover": "#93c5fd",
  "--sidebar-icon-color": "#1e40af",
  "--sidebar-icon-color-active": "#1d4ed8",
  "--sidebar-text": "#1e3a8a",
  "--sidebar-text-muted": "#3b82f6",
  "--sidebar-link-hover-bg": "rgba(147, 197, 253, 0.7)",
  "--sidebar-link-active-bg": "#93c5fd",
  "--sidebar-link-active-text": "#1e3a8a",
  "--sidebar-category-text": "#1d4ed8",
  "--sidebar-user-card-bg": "rgba(255, 255, 255, 0.95)",
  "--sidebar-user-card-border": "#93c5fd",
  "--sidebar-button-border": "#93c5fd",
  "--sidebar-button-hover-bg": "#bfdbfe",
  "--sidebar-button-hover-text": "#1d4ed8",
  "--sidebar-focus-ring": "rgba(29, 78, 216, 0.4)",
};

export function getSidebarThemeStyles(): SidebarThemeVars {
  return blueLight;
}
