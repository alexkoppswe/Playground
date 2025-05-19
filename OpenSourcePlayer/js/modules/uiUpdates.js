//  uiUpdates.js

/*============// UI Updates //============
  1. update UI function
    -loop updates
  2. Volume & seeker-bar updates functions
    -Value, Visual, background
  3. Updates timestamps functions
  5. Updates the icons & text functions
    -Svg, Button, Text
  6. Checks the video's vertical aspect ratio function
  7. Resizes the canvas function
  8. Renders the video on the canvas function
  9. Helper functions
    -Timestamp update function
    -Convert unit to pixels function for seeker-bar
  ======================================== */

import { config } from './OpenSourcePlayer.js';
import { svgIcons } from './controls.js';
import { states } from './stateMachine.js';

const rafScheduledMap = new Map();

// Main UI update function
export async function updateUI(video, controls, playerStateMachine) {
  if (!video || !controls || !playerStateMachine) return;
  const opid = video.closest('.osp-player')?.getAttribute('opid');
  if (!opid) return;

  // --- Dynamic Updates ---
  const currentState = playerStateMachine.getState('playback');
  const isPlaying = currentState === states.PLAYING;
  const currentlyScheduled = rafScheduledMap.get(opid) || false;

  if (isPlaying && !currentlyScheduled) {
    rafScheduledMap.set(opid, true);
    requestAnimationFrame(() => continuousUpdateLoop(video, controls, playerStateMachine));
  } else if (!isPlaying && currentlyScheduled) {
    rafScheduledMap.set(opid, false);
  }

  // --- Static Updates (based on current state machine state) ---
  if (config.useSvgIcons) {
    updateSvgIcons(video, controls, svgIcons, playerStateMachine);
  } else {
    updateTextContent(video, controls, playerStateMachine);
  }
  updateVolumeBar(video, controls.volumeBar, playerStateMachine);
  updateTimestamps(video, controls);

  if (playerStateMachine.getState('seeking') !== states.SEEKING) {
    await updateSeekerBarValue(video, controls.seekerBar, playerStateMachine);
   }

 await updateSeekerBarVisuals(video, controls.seekerBar, playerStateMachine);
}

async function continuousUpdateLoop(video, controls, playerStateMachine) {
    const opid = video.closest('.osp-player')?.getAttribute('opid');
    if (!opid) return;

    if (playerStateMachine.getState('playback') !== states.PLAYING || !rafScheduledMap.get(opid)) {
      rafScheduledMap.set(opid, false);
      return;
    }

    if (playerStateMachine.getState('seeking') !== states.SEEKING) {
      await updateSeekerBarValue(video, controls.seekerBar, playerStateMachine);
    }
    await updateTimestamps(video, controls);

    if (rafScheduledMap.get(opid)) {
      requestAnimationFrame(() => continuousUpdateLoop(video, controls, playerStateMachine));
    }
}

// Bars & timestamps
async function updateSeekerBarValue(video, seekerBar, playerStateMachine) {
  if (!video || !seekerBar || !playerStateMachine) return;
  if (playerStateMachine.getState('seeking') === states.SEEKING) return;

  const currentTime = parseFloat(video.currentTime);
  const duration = parseFloat(video.duration);
  let rawPercentage = 0;

  if (!isNaN(duration) && duration > 0.0) {
    rawPercentage = ((currentTime / duration) * 100);
    rawPercentage = Math.max(0, Math.min(100, rawPercentage));
    seekerBar.value = rawPercentage;

    let bufferedEndPercent = 0;
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      bufferedEndPercent = (bufferedEnd / duration) * 100;
      if (duration - bufferedEnd < 0.1 || bufferedEndPercent >= 100) {
        bufferedEndPercent = 100;
      }
    }

    seekerBar.style.setProperty('--buffered-percentage', `${bufferedEndPercent.toFixed(1)}%`);
    await updateSliderBackground(seekerBar);
  } else {
    seekerBar.value = 0;
    seekerBar.style.setProperty('--buffered-percentage', `0%`);
    await updateSliderBackground(seekerBar);
  }
}

// Updates the background & the seekers 'head'.
export async function updateSeekerBarVisuals(video, seekerBar, playerStateMachine) {
  if (!seekerBar || !playerStateMachine) return;
  const duration = parseFloat(video.duration);
  let bufferedEndPercent = 0;

  if (!isNaN(duration) && duration > 0 && video.buffered.length > 0) {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    bufferedEndPercent = (bufferedEnd / duration) * 100;

    if (duration - bufferedEnd < 0.1 || bufferedEndPercent >= 100) {
      bufferedEndPercent = 100;
    }
  }

  seekerBar.style.setProperty('--buffered-percentage', `${bufferedEndPercent.toFixed(1)}%`);    
  await updateSliderBackground(seekerBar);
}

// Updates the background left of the seekers 'head'.
export async function updateSliderBackground(slider) {
  if (!slider || !slider.isConnected) return;
  
  const min = parseFloat(slider.min) || 0.0;
  const max = parseFloat(slider.max) || 100.0;
  const value = parseFloat(slider.value);

  let percentage = 0;
  if (max > min) {
    percentage = ((value - min) / (max - min)) * 100;
  }
  let visualPercentage = percentage;

  try {
    const trackWidth = slider.offsetWidth;
    if (trackWidth > 0) {
      const thumbWidthStyle = getComputedStyle(slider).getPropertyValue('--osp-thumb-width').trim();
      const thumbWidthPx = getSeekThumbHeight(thumbWidthStyle || '1em');

      if (thumbWidthPx > 0) {
        const offsetPercent = (thumbWidthPx / 2 / trackWidth) * 100;
        const valueRatio = percentage / 100;
        visualPercentage = offsetPercent + valueRatio * (100 - 2 * offsetPercent);
      }
    }
  } catch (e) {
    console.warn("Could not calculate thumb offset for slider:", slider, e);
    visualPercentage = percentage;
  }

  // Round the visual percentage to avoid floating point issues
  if (visualPercentage >= 98.7) {
    visualPercentage = 100.0;
  } else if (visualPercentage <= 1.1) {
    visualPercentage = 0.0;
  }
  slider.style.setProperty('--current-percentage', `${visualPercentage.toFixed(2)}%`);

  // Rounded corners for the seeker bar at start/end
  if (slider.classList.contains('osp-seeker-bar')) {
    if (visualPercentage <= 0.9) {
      slider.style.borderRadius = '5px 0 0 5px';
    } else if (visualPercentage >= 99.1) {
      slider.style.borderRadius = '0 5px 5px 0';
    } else {
      slider.style.borderRadius = '0px';
    }
  }
}

// Volume bar
async function updateVolumeBar(video, volumeBar, playerStateMachine) {
  if (!video || !volumeBar || !playerStateMachine) return;

  const isMuted = video.volume === 0 || video.muted;
  if (!isMuted) {
    sessionStorage.setItem('videoVolume', video.volume);
  }

  playerStateMachine.setState('volume', isMuted ? states.MUTED : states.UNMUTED);
  volumeBar.value = isMuted ? 0 : video.volume;
  updateSliderBackground(volumeBar);
}

// Timestamps
export async function updateTimestamps(video, controls) {
  const { timestamp, timelength } = controls;
  const currentTime = video.currentTime;
  const duration = video.duration;

  if (timestamp && timelength) {
    timestamp.textContent = isNaN(currentTime) ? '' : formatTime(Number(currentTime));
    timelength.textContent = isNaN(duration) ? '00:00' : formatTime(Number(duration));
  }
}

// Update Svg icons and buttons
export async function updateSvgIcons(video, controls, svgIcons, playerStateMachine) {
  if (!video || !controls || !playerStateMachine) return;

  const playbackState = playerStateMachine.getState('playback');
  //const volumeState = playerStateMachine.getState('volume');  volumeState === states.MUTED || 
  const isFullscreenActive = playerStateMachine.getState('display') === states.FULLSCREEN;
  const cinematicState = playerStateMachine.getState('visualMode')  === states.CINEMATIC_MODE;

  const isEffectivelyMuted = video.volume === 0 || video.muted;
  const isEffectivelyPlaying = playbackState === states.PLAYING;

  const updates = [
    { button: controls.playPauseBtn, iconId: isEffectivelyPlaying ? svgIcons.pause : svgIcons.play },
    { button: controls.muteBtn, iconId: isEffectivelyMuted ? svgIcons.mute : svgIcons.volumeUp },
    { button: controls.cinematicModeBtn, iconId: cinematicState ? svgIcons.cinemaModeQ : svgIcons.cinemaMode },
    { button: controls.fullScreenBtn, iconId: isFullscreenActive ? svgIcons.fullscreenExit : svgIcons.fullscreen }
  ];

  for (const { button, iconId } of updates) {
    if (button && button.isConnected) {
      updateButtonIcon(button, iconId);
    }
  }
}

// Update Svg icon
export async function updateButtonIcon(button, iconId) {
  try {
    let svgElement = button.querySelector('svg');
    let useElement;

    if (!svgElement) {
      svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      useElement = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      svgElement.appendChild(useElement);
      svgElement.setAttribute('aria-hidden', 'false');
      svgElement.setAttribute('focusable', 'false');
      button.innerHTML = '';
      button.appendChild(svgElement);
    } else {
      useElement = svgElement.querySelector('use');
    }

    useElement.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', iconId);
  } catch (error) {
    console.error(`Error loading SVG icon: ${error}`);
  }
}

// Update Text content
function updateTextContent(video, controls, stateMachine) {
  const { playPauseBtn, muteBtn, cinematicModeBtn, fullScreenBtn } = controls;
  const isCinematicMode = stateMachine.getState('visualMode') === states.CINEMATIC_MODE;
  const isFullscreen = stateMachine.getState('display') === states.FULLSCREEN;
  
  if (playPauseBtn) playPauseBtn.textContent = video.paused ? "►" : "❚❚";
  if (muteBtn) muteBtn.textContent = video.muted ? '🔇' : '🔊';
  if (cinematicModeBtn) cinematicModeBtn.style.filter = isCinematicMode ? "grayscale(100%)" : "none";
  if (fullScreenBtn) fullScreenBtn.textContent = isFullscreen ? '⧈' : '⛶';
}

// Check if the video is vertical
export function checkIfVertical(video) {
  let isVertical = false;
  if (!config.useVerticalVidFill || !video) return false;

  const videoAspect = video.videoHeight / video.videoWidth;
  isVertical = videoAspect > 1;
  return isVertical;
}

// Resize the canvas
export function resizeCanvas(container) {
  if (!container) return;

  let canvas = container.querySelector('.osp-player-background');
  const useFill = config.useVerticalVidFill;
  const isVertical = checkIfVertical(container.querySelector('video'));
  if (useFill && isVertical) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.classList.add('osp-player-background');
      container.prepend(canvas);
      const ctx = canvas.getContext('2d');
      container.canvasContext = ctx;
    }
  
    const width = container.clientWidth;
    const height = container.clientHeight;
  
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  } else {
    if (canvas) {
      canvas.remove();
      container.canvasContext = null;
    }
  }
}

// Render the video on the canvas
export function renderCanvas(video, container) {
  if (!config.useVerticalVidFill || !video || !container) return;
  if (!checkIfVertical(video)) return;

  const canvas = container.querySelector('.osp-player-background');
  const ctx = container.canvasContext;
  if (!canvas || !ctx) return;

  if (!video.paused && !video.ended) {
    video.style.background = 'transparent';
    requestAnimationFrame(() => {
      if (!video.paused && !video.ended && checkIfVertical(video)) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        renderCanvas(video, container);
      }
    });
  }
}

// Helpers
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Helper function to convert unit to pixels (relative to root font size)
function getSeekThumbHeight(remValue) {
  const value = parseFloat(remValue);
  const unit = remValue.replace(value, '');
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  switch (unit) {
    case 'px':
      return value;
    case 'em':
      return value * rootFontSize;
    case 'rem':
      return value * rootFontSize;
    default:
      return 0;
  }
}