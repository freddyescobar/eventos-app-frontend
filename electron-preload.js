// Preload script (runs before renderer process is loaded)
// Can expose APIs to the renderer process via window.electron API if needed in the future

window.addEventListener('DOMContentLoaded', () => {
  console.log('[Electron Preload] Loaded successfully');
});
