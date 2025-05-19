// script.js
document.addEventListener('DOMContentLoaded', async () => {
  const { initializePlayer } = await import('./modules/OpenSourcePlayer.js');
  initializePlayer();
});
