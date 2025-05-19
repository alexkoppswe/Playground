//  videoInput.js

/*=======// Video Input Module //=======
  1. Toggle play/pause function
  2. toggle mute function
  3. toggle fullscreen function
  4. toggle settingsMenu function
  5. toggle cinematicMode function
  6. toggle loop function
  7. toggle subtitles function
  8. toggle pip function
  9. Prefetches the next video segment function
  10. Handle skip & volume from keyboard functions
     -increaseVolume
     -decreaseVolume
     -skipBackward
     -skipForward
======================================== */

import { config } from './OpenSourcePlayer.js';
import { states } from './stateMachine.js';
import { mouseMoveTimer } from './mouseEvents.js';

// Helper to get the state machine instance
function getPlayerStateMachine(videoElement) {
  const playerContainer = videoElement.closest('.osp-player');
  return playerContainer?.stateMachine;
}

// Play/Pause
export function togglePlayPause(video) {
  if (!video || video.error) return;
  const stateMachine = getPlayerStateMachine(video);

  if (video.paused && stateMachine?.getState('playback') !== states.ERROR) {
    video.play().catch(e => {
      stateMachine?.setState('playback', states.ERROR);
      if (config.debugger) console.error(`Player ${video.closest('.osp-player')?.getAttribute('opid')}: Playback error:`, e);
    });
  } else {
    video.pause();
  }
}

// Mute
export function toggleMute(video) {
  if (!video) return;
  
  const storedVolume = sessionStorage.getItem('videoVolume');
  const stateMachine = getPlayerStateMachine(video);
  video.muted = !video.muted;

  if (video.muted) {
    video.volume = 0;
    stateMachine?.setState('volume', states.MUTED);
  } else {
    if (storedVolume && storedVolume > 0.0) {
      video.volume = parseFloat(storedVolume);
    } else {
      video.volume = 0.1;
    }
    stateMachine?.setState('volume', states.UNMUTED);
  }
}

// Fullscreen
export function toggleFullscreen(videoPlayerContainer, video) {
  try {
    const stateMachine = getPlayerStateMachine(video);
    if (!document.fullscreenElement) {
      videoPlayerContainer.controls = false;
      videoPlayerContainer.requestFullscreen();
      stateMachine?.setState('display', states.FULLSCREEN);
      clearTimeout(mouseMoveTimer);
    } else {
      document.exitFullscreen();
      stateMachine?.setState('display', states.WINDOWED);
      videoPlayerContainer.scrollIntoView();
    }
  } catch (error) {
    console.error("An error occurred while toggling fullscreen:", error);
    videoPlayerContainer.controls = true;
  }
}

// Settings Menu
export function toggleSettingsMenu(video, settingsMenu, settingsButton) {
  if (!config.useSettings || !video || video.tagName === 'AUDIO') return;

  const stateMachine = getPlayerStateMachine(video);
  const track = video.querySelector('track');
  if (!track && !config.useCinematicMode) return;

  settingsMenu.classList.toggle('open');
  stateMachine.toggleState('settings', states.SETTINGS_OPEN, states.SETTINGS_CLOSED);

  document.addEventListener('click', (event) => {
    if (!settingsMenu.contains(event.target) && !settingsButton.contains(event.target)) {
      settingsMenu.classList.remove('open');
    }
  });
}

// Cinematic Mode
export function toggleCinematicMode(video) {
  if (!config.useCinematicMode) return;

  const stateMachine = getPlayerStateMachine(video);
  stateMachine.toggleState('visualMode', states.CINEMATIC_MODE, states.NORMAL_MODE);
  const isCinematicMode = stateMachine.getState('visualMode') === states.CINEMATIC_MODE;
  document.body.classList.toggle("osp-cinema", isCinematicMode);
}

// Loop
export function toggleLoop(video) {
  if (!video) return;
  
  const stateMachine = getPlayerStateMachine(video);
  video.loop = !video.loop;
  stateMachine.setState('loop', video.loop ? states.LOOPING : states.NOT_LOOPING);
}

// Subtitles
export function toggleSubtitles(videoPlayerContainer, video, subtitleButton) {
  if (!video) return;
  if (!config.useSubtitles) return;
  
  const stateMachine = getPlayerStateMachine(video);
  const track = video.querySelector('track');

  if (track) {
    const subtitleTrack = videoPlayerContainer.querySelector('.osp-track');
    const subtitlesEnabled = stateMachine.getState('subtitles') === states.SUBTITLES_ON;
    stateMachine.toggleState('subtitles', states.SUBTITLES_ON, states.SUBTITLES_OFF);

    if (!subtitlesEnabled && subtitleTrack) subtitleTrack.style.display = 'block';

    if(subtitleButton && subtitleTrack) {
      const subtitleTrackText = subtitleTrack.querySelector('.osp-track-subtitle');
      if (subtitleTrackText) {
        subtitleTrackText.textContent = subtitlesEnabled ? 'Subtitles Off' : 'Subtitles On';
      } else {
        const subtitleText = document.createElement("div");
        subtitleText.className = "osp-track-subtitle";
        subtitleText.textContent = subtitlesEnabled ? 'Subtitles Off' : 'Subtitles On';
        subtitleTrack.appendChild(subtitleText);
      }

      setTimeout(() => {
        if (subtitleTrackText) {
          if (subtitleTrackText.textContent === 'Subtitles Off') {
            subtitleTrack.style.display = 'none';
          }
          if (subtitleTrackText.textContent === 'Subtitles On') {
            subtitleTrackText.textContent = null;
          }
        }
      }, 600);
    }
    
  } else {
    console.warn('No subtitles found');
  }
}

// PIP
export function togglePip(video) {
  if (!video) return;
  
  try {
    const stateMachine = getPlayerStateMachine(video);
    if (document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
        stateMachine.setState('pip', states.PIP_DISABLED);
      } else {
        video.requestPictureInPicture();
        stateMachine.setState('pip', states.PIP_ENABLED);
      }
    } else {
      console.warn('Picture-in-picture is not supported in this browser.');
    }
  } catch (error) {
    console.error("An error occurred while toggling picture-in-picture:", error);
  }
}

// Prefetch
export async function prefetchNextSegment(video) {
  if (!video) return;

  const nextSegmentUrl = video.getAttribute('src');
  if (nextSegmentUrl && (video.buffered.length === 0 || video.buffered.end(0) <= video.currentTime)) {
    try {
      const cache = await caches.open('video-buffer');
      cache.add(nextSegmentUrl).catch(error => {
        console.error('Error prefetching video segment:', error);
      });
    } catch (error) {
      console.error('Error opening cache for video segment:', error);
    }
  }
}

// Keyboard shortcuts for skip & volume
export function increaseVolume(video) {
  if (!video) return;
  
  if(video.muted) video.muted = false;
  video.volume = Math.min(parseFloat((video.volume + 0.1).toFixed(1)), 1);
}

export function decreaseVolume(video) {
  if (!video) return;

  if (!video.muted) {
    video.volume = Math.max(parseFloat((video.volume - 0.1).toFixed(1)), 0);
  }
}

export function skipBackward(video) {
  if (!video) return;
  video.currentTime = Math.max(Math.floor(video.currentTime - 10), video.minSegmentDuration || 0);
}

export function skipForward(video) {
  if (!video) return;
  video.currentTime = Math.min(Math.ceil(video.currentTime + 10), video.duration);
}
