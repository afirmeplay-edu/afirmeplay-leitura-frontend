type Guard = () => boolean;

let activeGuard: Guard | null = null;

/** Uma tela com alterações não salvas registra aqui; navegações programáticas (ex.: seletor de sistema) consultam. */
export function setNavigationGuard(guard: Guard | null) {
  activeGuard = guard;
}

export function confirmNavigation() {
  return activeGuard ? activeGuard() : true;
}
