//  subtitles.js

/*=======// Subtitles Module //========
  1. State Machine Helper
  2. Loads & display subtitles function
  3. Fetches subtitle file function
  ===================================== */

import { config } from './OpenSourcePlayer.js';
import { states } from './stateMachine.js';

function getPlayerStateMachine(videoElement) {
  const playerContainer = videoElement.closest('.osp-player');
  return playerContainer?.stateMachine;
}

// Load & display subtitles
export async function loadSubtitle(video, subtitlePath) {
  if (!video || !config.useSubtitles) return false;

  try {
    const stateMachine = getPlayerStateMachine(video);
    const subtitleText = await fetchSubtitle(subtitlePath);
    
    if (!subtitleText) {
      console.error('Failed to load subtitles');
      return false;
    }

    const customSubtitleContainer = document.createElement("div");
    customSubtitleContainer.className = "osp-track";
    video.parentNode.appendChild(customSubtitleContainer);

    const subtitleSource = document.createElement("track");
    subtitleSource.kind = "metadata";
    subtitleSource.src = subtitlePath;
    subtitleSource.default = true;
    subtitleSource.mode = "hidden";
    subtitleSource.srclang = "en";
    subtitleSource.label = "English";

    video.appendChild(subtitleSource);

    subtitleSource.addEventListener("cuechange", function () {
      const useSubtitle = stateMachine.getState('subtitles') === states.SUBTITLES_ON;
      const activeCues = subtitleSource.track.activeCues;
      customSubtitleContainer.innerHTML = "";

      if (useSubtitle) {
        for (let i = 0; i < activeCues.length; i++) {
          const cue = activeCues[i];
          const cueDiv = document.createElement("div");
          cueDiv.className = "osp-track-subtitle";
          cueDiv.textContent = cue.text;
          customSubtitleContainer.appendChild(cueDiv);
        }
      }
    });
  } catch (error) {
    console.error("An error occurred while loading subtitles:", error);
    return false;
  }
}

// Fetch subtitle file
async function fetchSubtitle(subtitleUrl) {
  try {
    const cache = await caches.open('subtitle-cache');
    const cachedResponse = await cache.match(subtitleUrl);
    if (cachedResponse) {
      return cachedResponse.text();
    } else {
      const response = await fetch(subtitleUrl, {
        mode: 'cors',
        cache: 'force-cache',
        headers: {
          'Accept-Encoding': 'br, gzip, deflate, compress, text/plain'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${subtitleUrl}: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      if (!contentType.includes('text/vtt')) {
        throw new Error(`Invalid subtitle content type: ${contentType}`);
      }

      await cache.put(subtitleUrl, response.clone());
      return response.text();
    }
  } catch (error) {
    console.error(`Error fetching subtitle: ${error}`);
    return null;
  }
}
