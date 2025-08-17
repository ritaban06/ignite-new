// Handles global disabling of F12, Ctrl+S, Ctrl+P, Ctrl+A, DevTools shortcuts

const SECURE_GLOBAL_DISABLE = import.meta.env.VITE_SECURE_GLOBAL_DISABLE === 'true';

let listenersActive = false;

function handleKeyDown(e) {
  if (!SECURE_GLOBAL_DISABLE) return;
  // Disable Ctrl+S, Ctrl+P, Ctrl+A, F12, DevTools
  if (
    (e.ctrlKey && (e.key === 's' || e.key === 'S')) ||
    (e.ctrlKey && (e.key === 'p' || e.key === 'P')) ||
    (e.ctrlKey && (e.key === 'a' || e.key === 'A')) ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
    (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
    (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) ||
    e.key === 'F12' ||
    e.keyCode === 123
  ) {
    e.preventDefault();
    // Optionally show a toast or alert
    window.dispatchEvent(new CustomEvent('globalSecurityBlocked', { detail: e.key }));
    return false;
  }
}

function handleContextMenu(e) {
  if (!SECURE_GLOBAL_DISABLE) return;
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('globalSecurityBlocked', { detail: 'contextmenu' }));
  return false;
}

export function enableGlobalSecurity() {
  if (listenersActive) return;
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('contextmenu', handleContextMenu);
  listenersActive = true;
}

export function disableGlobalSecurity() {
  if (!listenersActive) return;
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('contextmenu', handleContextMenu);
  listenersActive = false;
}

export function isGlobalSecurityEnabled() {
  return SECURE_GLOBAL_DISABLE;
}
