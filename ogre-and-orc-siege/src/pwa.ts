/** Registers the offline service worker for the installed app. */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:') return;
  // the dev server injects this client; caching a dev page would fight hot reload
  if (document.querySelector('script[src="/@vite/client"]')) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // no offline install: the game still runs exactly as before
    });
  });
}
