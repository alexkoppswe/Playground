// videoPlug.js
import { config } from './OpenSourcePlayer.js';
const plugCooldownMap = new Map();

export function plug(video, opid) {
  if (!video, !config.usePlug, !opid) return false;

  return new Promise((resolve) => {
    try {
      // Anti-spam check
      const lastPlugTime = plugCooldownMap.get(opid) || 0;
      const now = Date.now();
      if (now - lastPlugTime < 3000) { // 3s cooldown
        resolve(false);
        return;
      }
      plugCooldownMap.set(opid, now);

      const overlayId = `osp-plug-${opid}`;
      const existing = document.getElementById(overlayId);
      if (existing) existing.remove();

      // --- Create Overlay Elements ---
      const overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.className = 'osp-plug-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Playback message');

      const inner = document.createElement('div');
      inner.className = 'osp-plug-inner';

      const contentBox = document.createElement('div');
      contentBox.className = 'osp-plug-content';
      contentBox.setAttribute('tabindex', '-1');

      const closeBtn = document.createElement('button');
      closeBtn.className = 'osp-plug-close';
      closeBtn.setAttribute('aria-label', 'Close message');
      closeBtn.setAttribute('title', 'Close');
      closeBtn.innerText = '×';

      // --- Parse plugID ---
      let plugId = null;
      let duration = 0; // Default duration 0 (no timer)
      plugId = video.getAttribute('data-plugId') ?? null;

      if (plugId === null) {
        console.error(`[Plug ${opid}] Error parsing data-plugId='${plugId}'`);
        resolve(false);
        return;
      }

      // --- Get Content ---
      const template = getContentTemplates(plugId);
      if (!template?.element) {
        console.error(`[Plug ${opid}] Failed to generate content for plugId ${plugId}.`);
        resolve(false);
        return;
      }
      const { element: contentElement, duration: customDuration = 0 } = template;
      duration = customDuration;
      contentBox.appendChild(contentElement);

      if (duration > 0) {
        startCountdown(closeBtn, duration);
      }

      // --- Assemble and Append Overlay ---
      inner.appendChild(closeBtn);
      inner.appendChild(contentBox);
      overlay.appendChild(inner);

      if (!video?.parentElement) {
        console.error(`[Plug ${opid}] Video element is not in the DOM or has no parent.`);
        resolve(false);
        return;
      }
      video.parentElement.appendChild(overlay);
      video.setAttribute('aria-hidden', 'true');

      // --- Timer and Cleanup Logic ---
      let timerId = null;
      let enableBtnId = null;
      const isTimered = duration > 0;
      closeBtn.disabled = isTimered; // Disable close button if there's a timer

      const cleanup = () => {
        clearTimeout(timerId);
        clearTimeout(enableBtnId);
        if (video) video.removeAttribute('aria-hidden');
        if (overlay?.parentElement) overlay.remove();
        resolve(true);
      };

      // Enable close button after duration delay
      if (isTimered) {
        enableBtnId = setTimeout(() => {
          closeBtn.disabled = false;
          inner.style.backgroundColor = 'rgba(70, 70, 70, 0.60)';

          // Auto close plug window logic
          if (plugId === '1') {
            cleanup();
          }
        }, duration * 1000);
      } else {
        closeBtn.disabled = false;
        inner.style.backgroundColor = 'rgba(70, 70, 70, 0.60)';
      }

      closeBtn.addEventListener('click', () => {
        if (!closeBtn.disabled) {
          cleanup();
        }
      }, { once: true });
    } catch (err) {
      const overlay = document.getElementById(`osp-plug-${opid}`);
      if (overlay) overlay.remove();
      if (video) video.removeAttribute('aria-hidden');
      console.error(`[Plug ${opid}] Unexpected error in plug():`, err);
      resolve(false);
    }
  });
}

// Function to generate content based on plugId
function getContentTemplates(plugId) {
  const templates = {
    1: () => {
      const container = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = 'Example Plug';
      container.appendChild(title);

      const message = document.createElement('p');
      const duration = 10;
      message.textContent = `This message will disappear in ${duration} seconds.`;
      container.appendChild(message);

      const image = document.createElement('img');
      // Example image source (base64 encoded GIF)
      const imgSrc = 'data:image/gif;base64,UklGRrgFAABXRUJQVlA4WAoAAAAYAAAANwAANwAAQUxQSCgBAAABgKpt+/rkN6uWsLQRSe7ursmJRBIH4VDd3d0PgOp2Ag7/bbi+c/k+LEbEBAiPBxQWF5XEqgRtdVrjzCEAGDfHJhpyQ9REglv2P+Dy1/N+SzCB4E4jPCktZXspuNMIT792BXtCptcKodDndEjwpqnNxz3F7NnU2MbVF7y9l+GWyHkETanMLZGyQwNv7Rp3ROQDDWBW604dyM5qXCs10UG7S0HnIPyW60o3SO/5OMt+pYU2ZyMgbgp2pN6jhgZHaR/kthQOGkH+yuBght5bjJ1ml95rtF3oK5fAay6ig00Fmw4uwRKXFjDRHXCpAZdlLsESl05wfIsRsWYWVwaxDZYbCgGeY4LL+L/FGJsNBZcrPZf3eC6oZTPAZkvFxRjLBQVs6tmY2PyiAVZQOCCMAwAAMBAAnQEqOAA4AD7NVKNMJ6SjIi4baqjwGYlAGCIHyecdEJ6xjzt5yUrmGg+Sf6m9ghVVzOGYpTB2bz5UdDrbQcjYJb52UoKvsJhrex5N9IsFSZfqnTdgm/68Eqkcdlp2KZVSszfptjcbZwMSnyOHpp/8lZJIe7wO+cG0O6WBzpit6VFzAz31/XIAAP7yow2j+sTgtFgWMvptXNXbferGtuJxFj9nfFHIt3o04JhJswZ1BGakGnwnKl6GA+rRM+aqd2GuO11c5QIgCAAiDSVC6CXSYxgVJhvP+Pl3MmMuVe9Y8P2x+KYeFsf/8tfiYpF4yyNy92MShlx7A7WzSiwjiNqAfWLp6BdOVkh/qkjhfB9R4y39oUOiojHRKum6GRSl0TLsqHQ+KH/wv/ZmgLSHqsfIOKLqlqMzXTyQfy95ZBK6VJGwR053k2OA7Cj/eo5SMlt4SZC0MUAu8+AS6E3EP1dGE0bPNX3KfSB7dhJIm4h1UyLwgPbhu+nuRYH9jS9SEEwOIuHMdzkJgoProQAXovG4HqYtPhymmz621R3FfjhbWKMFx6cGoxsIVDUgTKGJzBXbCNv5nlCyTYsbD2Wtu/HeZ3KqHGjkHiMk7LiTIhdsAB3/U7I3BAPw50rUhwyomiwwRn2hMNN+gdPmPtjUptQ/+CPUP7qS/a7i8P1l+cmR3tmCfpwMYV/U6x9ZtXtJMMh+qAv/hxqZbAZHZcPsPrjl/Ypn2d1lZUTL4fyS2qpjAif5s0q+8arY2Z+uT+u4gUQR7fAkR20OSDC+RoLkSC3acD/XZgYSZkCuXWDzU/s7UhtusK6L3Lm79/y+MaoMxGb0H5sWK5cQM/Clln19xJuh4ECs+G4qU4DhumdUtIDO4T53S29+LIoRhVeMFX7l2j/wdT2JTpGdVxQ/tjWiDbCP3uVvkOAfj4D8N3nAiRmyhAr8IVg5mQUCAyyOlKfBaeRv63NnMrNzBG5Zd2+qzCgXd9ynb8jhLiGeZ9ZbOLqRYQWhAqg3sQGXyEE9a7+0OSSTlya/v63EbEqn+/Yjk5SybkHNO2JntGs0siQzokKq4Ctsh2sst1MKXqv1+3OkIOi5N+U03udRKTxt/nBCJKJk4uXd5a0cEE7tu5F+uD4k0wXUDP5N1tdxzVZNxCTwt2qahqwlHmwTCIV4VXM0NJGIrMU2W/TVnlDVF3AgQB1Mthleuy3lIYAwQABFWElG1gAAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAAxAQIAEAAAAGYAAABphwQAAQAAAHYAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuNwAFAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAKgBAABAAAAOAAAAAOgBAABAAAAOAAAAAWgBAABAAAAuAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA=';
      image.style.width = '100px';
      image.style.height = '100px';
      image.setAttribute('loading', 'lazy');
      image.src = imgSrc;
      image.alt = 'Plug illustration';
      container.appendChild(image);

      return { element: container, duration };
    },
    // Example for external video content from iframe
    2: () => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('allow', 'encrypted-media;');
      iframe.setAttribute('loading', 'lazy');
      iframe.sandbox = 'allow-scripts allow-same-origin';
      iframe.className = 'osp-plug-ext-content';
      iframe.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      return { element: iframe, duration: 2 };
    },
    default: () => {
      const container = document.createElement('div');
      const message = document.createElement('p');
      message.textContent = 'Plug message';
      container.appendChild(message);
      return { element: container, duration: 0 };
    },
  };

  const templateBuilder = templates[plugId] || templates.default;
  return templateBuilder();
}

function startCountdown(button, seconds) {
  if (!seconds || seconds <= 0) return;

  let remaining = seconds;
  button.innerText = `${remaining}`;

  const countdownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining > 1) {
      button.innerText = `${remaining}`;
      button.setAttribute('aria-label', 'Close in ' + remaining + ' seconds');
    } else {
      button.innerText = '×';
      button.setAttribute('aria-label', 'Close');
      clearInterval(countdownInterval);
    }
  }, 1000);
}
