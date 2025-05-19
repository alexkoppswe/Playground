//  OpenSourcePlayer.js - Main player module for OSP

/* ===// Player //===
  1. Global configuration variables
  2. ID Generation & Message Display functions
  3. Initialize player function
    -Media elements
    -State Machine
    -Controls
    -Media Source
    -Event listeners
    -Plug
  4. Video player setup function
    -Sources setup
    -MediaSource setup
    -Subtitles setup
  5. Destroy player function
  6. Helper functions
    -Check media support
    -Viewport check and load
    -External source/url check
  ================================ */

import { setupVideoControls, removeVideoControls } from './controls.js';
import { addEventListeners } from './eventListeners.js';
import { StateMachine, states } from './stateMachine.js';
import { initializeContextMenu } from './contextMenu.js';
import { plug } from './videoPlug.js';

// Global Configuration
const config = {
  mouseEvent: true,
  useSvgIcons: true,
  useMediaSource: false,
  useSubtitles: false,
  useSettings: true,
  useContextMenu: true,
  useVerticalVidFill: false,
  useCinematicMode: true,
  useFastForward: true,
  usePlug: false,
  debugger: false
};

const playerInstances = new Map();

// Generate a unique ID for players that don't have one
async function generateUniqueOpid() {
  return `osp-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
}

// Helper function to prevent context menu
const preventContextMenu = (event) => {
  event.preventDefault();
  if (config.debugger) console.log('Context menu temporarily blocked by Plug.');
};

// --- Helper Function to Show Error on Player UI ---
function displayPlayerError(playerContainer, message) {
  const messageDisplay = playerContainer?.querySelector('.osp-message-display');
  const loadingDisplay = playerContainer?.querySelector('.osp-loading-display');

  if (messageDisplay) {
    messageDisplay.textContent = message;
    messageDisplay.style.display = 'block';
  }
  if (loadingDisplay) {
    loadingDisplay.style.display = 'none';
  }
}

// Initialize player
export async function initializePlayer() {
  try {
    const players = document.querySelectorAll('.osp-player');
    await Promise.all(Array.from(players).map(async (player) => {
      let opid = player.getAttribute('opid');
      if (!opid) {
        opid = await generateUniqueOpid();
        player.setAttribute('opid', opid);
      }

      const video = player.querySelector('video');
      const audio = player.querySelector('audio');
      const mediaElement = video || audio;

      if (!mediaElement) {
        console.error(`Player ${opid}: No video or audio element found.`);
        return;
      }

      // State Machine
      const playerStateMachine = new StateMachine();
      player.stateMachine = playerStateMachine;
      const instanceInfo = {
        opid,
        player,
        mediaElement,
        stateMachine: playerStateMachine,
        controls: null
      };
      playerInstances.set(opid, instanceInfo);
      playerStateMachine.setState('playback', states.LOADING);

      // Controls
      let controls;
      try {
        controls = await setupVideoControls(mediaElement, player);
        instanceInfo.controls = controls;
      } catch (controlsError) {
        console.error(`Player ${opid}: Failed to set up controls.`, controlsError);
        playerStateMachine.setState('playback', states.ERROR);
        return;
      }
      
      // Source Validity Checks
      mediaElement.setAttribute('preload', 'none'); // Set default preload
      const sources = Array.from(mediaElement.querySelectorAll('source'));
      const initialSrcAttr = mediaElement.getAttribute('src');

      if (sources.length === 0 && !initialSrcAttr) {
        if (config.debugger) console.warn(`Player ${opid}: No <source> elements or src attribute found.`);
        playerStateMachine.setState('playback', states.ERROR);
        removeVideoControls(player);
        displayPlayerError(player, "No valid media source found.");
        return;
      }

      // Determine the first source URL to check
      let firstSourceUrl = initialSrcAttr || sources[0]?.getAttribute('src');

      if (!firstSourceUrl) {
        if (config.debugger) console.warn(`Player ${opid}: Could not determine an initial source URL.`);
        playerStateMachine.setState('playback', states.ERROR);
        removeVideoControls(player);
        displayPlayerError(player, "No valid media source found.");
        return;
      }

      // Event Listeners and Load Setup
      if (video) {
        /* Add extra video attributes if needed.
        video.setAttribute('playsinline', true);
        video.setAttribute('controlsList', 'nodownload');
        video.setAttribute('nodownload', '');*/

        // Video plug
        let plugWasShownAndCompleted = false;
        if (config.usePlug === true && video.hasAttribute('data-plugId')) {
          video.addEventListener('contextmenu', preventContextMenu);
          try {
            plugWasShownAndCompleted = await plug(video, opid);
          } catch (plugError) {
            console.error(`Player ${opid}: Error during plug execution:`, plugError);
            plugWasShownAndCompleted = false;
          } finally {
            video.removeEventListener('contextmenu', preventContextMenu);

            if (!plugWasShownAndCompleted) {
              console.error(`Player ${opid}: Video plug failed to load.`);
              return;
            }
          }
        }
        
        // Initialize context menu
        initializeContextMenu(video, player, controls.videoControls);
        
        // Set up the video player
        const setupResult = await videoPlayerSetup(video, sources);
        if (!setupResult) {
          playerStateMachine.setState('playback', states.ERROR);
        }
        
        // Add main event listeners
        if (playerStateMachine.getState('playback') !== states.ERROR) {
          await addEventListeners(video, player, controls, playerStateMachine);
        } else {
          console.error(`Player ${opid}: Video player setup failed.`);
        }
      } else if (audio) {
        audio.preload = 'metadata';
        await addEventListeners(audio, player, controls, playerStateMachine);
      }
    }));
  } catch (error) {
    console.error("An error occurred while initializing the player:", error);
  }
}

// Video player setup
export async function videoPlayerSetup(video, sources) {
  if (!video) return false;
  
  try {
    const opid = video.closest('.osp-player')?.getAttribute('opid') || 'unknown';
    const initialSource = sources.length > 0 ? sources[0] : null;
    const initialSrc = initialSource?.getAttribute('src') || video.getAttribute('src');
  
    // MediaSource setup
    if (config.useMediaSource && initialSrc) {
      const videoType = initialSource?.getAttribute('type') || `video/${initialSrc.split('.').pop()}`;
      
      try {
        const { setupMediaSource } = await import('./mediaSourceHelper.js');
        if (setupMediaSource && typeof setupMediaSource === 'function') {
          setupMediaSource(video, initialSrc, videoType);
        } else {
          console.warn(`Player ${opid}: MediaSource helper not loaded correctly.`);
        }
      } catch (msError) {
        console.error(`Player ${opid}: Failed to load or setup MediaSource helper.`, msError);
        if (!video.src && initialSrc) {
          video.src = initialSrc;
        }
      }
    } else {
      // Use the HTML5 video source directly for fallback or if MediaSource is disabled
      if (video.readyState < 2) {
        video.src = initialSrc;
      }
    }
  
    // [OPTIONAL] Check if the video is in the viewport and load it *NOTE: it runs once.
    const isInView = await isVideoInView(video);
    if (isInView) {
      video.setAttribute('loading', 'auto');
      video.preload = 'auto';
    } else {
      video.setAttribute('loading', 'lazy');
    }

    // Set preload to 'none' if a poster is set
    const posterSrc = video.getAttribute('poster');
    if (posterSrc && typeof posterSrc !== 'string') {
      video.preload = 'none';
    }

    // [OPTIONAL] Check if the video is loaded from an external URL
    if (isVideoLoadedFromExternalUrl(video)) {
      video.preload = 'metadata';
      if (config.debugger) console.log('Video is loaded from an external URL.' + video.src);
    }
  
    // [OPTIONAL] Check media support and brute force codec fallback
    if (video.readyState === 0) {
      video.preload = 'metadata';
      const isSupported = await checkMediaSupport(video.querySelector('source[src]'));
      if (config.debugger) console.log(`Player ${opid}: Media support check result: ${isSupported ? 'true' : 'false'}`);
    }
  
    // Load Subtitles
    const subtitleSrc = video.getAttribute('data-subtitle-src');
    if (config.useSubtitles && subtitleSrc && subtitleSrc.length > 0) {
      try {
        const { loadSubtitle } = await import('./subtitles.js');
        if(loadSubtitle && typeof loadSubtitle === 'function') {
          loadSubtitle(video, subtitleSrc);
        }
      } catch (subError) {
        if (config.debugger) console.error(`Player ${opid}: Failed to load subtitle module.`, subError);
      }
    }

    return true;
  } catch (error) {
    console.error(`Player ${opid}: Error during video player setup.`, error);
    return false;
  }
}

// Clean up the player.
export function destroyPlayer(opid) {
  const instanceInfo = playerInstances.get(opid) || null;
  if (instanceInfo && instanceInfo.player) {
    instanceInfo.stateMachine.clearListeners();
    playerInstances.delete(opid);
    instanceInfo.player.remove();
  }
}

// [OPTIONAL] Check media support function and brute force codec fallback.
async function checkMediaSupport(source) {
  try {
    if (!source) {
      console.warn('No source element found for the video.');
      return false;
    }

    let type = source.type || `video/${source.getAttribute('src').split('.').pop()}`;
    const codecOptions = ["vp9, vorbis", "avc1.42E01E, mp4a.40.5", "theora, vorbis", "vp8, opus", "mpeg4, aac", "theora, speex", "av01.0.15M.10", "V_MPEG4/ISO/AVC, A_AAC", "avc1.64001E, mp4a.40.2", "vorbis", "vp8", "flac"];
    const validVideoTypes = ["video/webm", "video/mp4", "video/ogg"];

    if (!validVideoTypes.includes(type)) {
      if (config.debugger) console.warn(`The type "${type}" is not a valid video type.`);
      return false;
    }

    if (!("MediaSource" in window) || !window.MediaSource) {
      console.warn('MediaSource is not supported.');
      return false;
    }

    for (const codec of codecOptions) {
      const updatedType = `${type}; codecs="${codec}"`;
      if (MediaSource.isTypeSupported(updatedType)) {
        source.setAttribute('type', updatedType);
        if (config.debugger) console.log(`Media type supported: ${updatedType}`);
        break;
      }
    }
    return true;
  } catch (error) {
    console.error("An error occurred while loading media:", error);
    return false;
  }
}

/**
 * Check if video is in view, on 1st load. threshold is the % of the video that must be visible
 * @example
 * if (isVideoInView(video, 0.8)) {
 *   console.log('At least 80% of the video is visible');
 * } else {
 *   console.log('Less than 80% of the video is visible');
 * }
 */
async function isVideoInView(video, threshold = 0.1) {
  try {
    const videoRect = video.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const visibleHeight = Math.max(0, Math.min(videoRect.bottom, viewportHeight) - Math.max(videoRect.top, 0));
    const visibleWidth = Math.max(0, Math.min(videoRect.right, viewportWidth) - Math.max(videoRect.left, 0));

    const visibleArea = visibleHeight * visibleWidth;
    const totalArea = videoRect.height * videoRect.width;

    const visiblePercentage = (visibleArea / totalArea) * 100;

    if (visiblePercentage.toFixed(0) > threshold * 100) {
      return video;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error checking if video is in view:', error);
    return false;
  }
}

async function isVideoLoadedFromExternalUrl(video) {
  const videoSrc = video.currentSrc || video.src;
  const currentOrigin = window.location.origin;
  const isExternal = videoSrc && videoSrc.startsWith('http') && !videoSrc.startsWith(currentOrigin);
  
  if (isExternal) {
    video.setAttribute('crossorigin', 'anonymous');
  }
  return isExternal;
}

// Export configuration
export { config };