// script.js
document.addEventListener('DOMContentLoaded', async () => {
  const { initializePlayer } = await import('./js/modules/OpenSourcePlayer.js');
  await initializePlayer();

  // [Optional.] Dark-mode (remove css variables as well if not needed.)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkColorScheme);

  async function checkColorScheme() {
    const theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
  await checkColorScheme();
});
