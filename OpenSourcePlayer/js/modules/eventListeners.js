//  eventlisteners.js

/*========// Event Listeners //=========
  1. Video loaded handler function 
  2. Error event listeners
  3. Functions
    -Video loaded function
    -Show message function
    -Show loading function
    -Max load time function
  4. Initial UI update
  5. Event listeners
    -Vertical video fill event listener
  6. Mouse event listeners
  7. Video event listeners
  8. Loading video event listeners
  9. Button click event listeners
  10. Volume & seeker-bar event listeners
  11. Keyboard shortcuts event listener
  ====================================== */

import { config, destroyPlayer } from './OpenSourcePlayer.js';
import { debounce } from './utils.js';
import { removeVideoControls } from './controls.js';
import { states } from './stateMachine.js';
import { handleMouseMove, showControls, mouseMoveTimer } from './mouseEvents.js';
import { updateUI, updateSliderBackground, checkIfVertical, resizeCanvas, renderCanvas, updateTimestamps, updateSeekerBarVisuals } from './uiUpdates.js';
import { togglePlayPause, toggleMute, toggleFullscreen, toggleSubtitles, toggleSettingsMenu, toggleCinematicMode, increaseVolume, decreaseVolume, skipBackward, skipForward, prefetchNextSegment } from './videoInput.js';

let loadingTimer;

// Main function
export async function addEventListeners(video, mediaContainer, controls, playerStateMachine) {
  const {
    playPauseBtn, muteBtn, fullScreenBtn, volumeBar, seekerBar,
    cinematicModeBtn, subtitleButton, settingsButton, settingsMenu,
    videoControls, loadingDisplay, messageDisplay, fastForwardBtn
  } = controls;

  const opid = mediaContainer.getAttribute('opid');
  mediaContainer.setAttribute('tabindex', '-1');

  //  Errors
  video.addEventListener('error', (event) => {
    const mediaError = event.target.error;
    playerStateMachine.setState('playback', states.ERROR);

    let errorMessage;
    switch (mediaError.code) {
      case mediaError.MEDIA_ERR_ABORTED:
        errorMessage = 'The fetching process for the media resource was aborted by the user.';
        break;
      case mediaError.MEDIA_ERR_NETWORK:
        errorMessage = 'A network error occurred while fetching the media resource.';
        break;
      case mediaError.MEDIA_ERR_DECODE:
        errorMessage = 'The media resource could not be decoded.';
        break;
      case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = 'The media resource is not supported.';
        break;
      case mediaError.MEDIA_ERR_ENCRYPTED:
        errorMessage = 'The media resource is encrypted and cannot be used.';
        break;
      case mediaError.MEDIA_ERR_INVALID_STATE:
        errorMessage = 'The media resource is in an invalid state.';
        break;
      case mediaError.NS_ERROR_DOM_MEDIA_METADATA_ERR:
        errorMessage = 'A metadata error occurred while fetching the media resource.';
        break;
      default:
        errorMessage = 'An error occurred while loading the video.';
        if (config.debugger) errorMessage = `Video error: ${mediaError}`;
        break;
    }

    if (config.debugger) console.warn(errorMessage, `Player ID: ${opid}`);

    removeVideoControls(mediaContainer);

    requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
    showMessage(errorMessage);
    return;
  });

  // Video loaded event
  async function videoLoaded() {
    setTimeout(() => {
      loadingDisplay.style.display = 'none';
    }, 100);
    messageDisplay.textContent = '';
    clearTimeout(loadingTimer);
    updateTimestamps(video, controls);

    if (config.useVerticalVidFill) {
      let isVertical = checkIfVertical(video);
      if (isVertical) {
        resizeCanvas(mediaContainer);
        renderCanvas(video, mediaContainer);
      }
    }
    requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
  }

  // Show message
  function showMessage(message) {
    setTimeout(() => {
      loadingDisplay.style.display = 'none';
    }, 100);

    loadingDisplay.style.display = 'none';
    messageDisplay.textContent = message;
    video.removeAttribute('poster');

    // Optional: Disable controls container visually
    const controlsOutter = mediaContainer?.querySelector('.osp-controls-outter');
    if (controlsOutter) {
      controlsOutter.style.opacity = '0.5';
      controlsOutter.style.pointerEvents = 'none';
    }
  }

  function showLoading() {
    playerStateMachine.setState('playback', states.LOADING);
    messageDisplay.textContent = '';

    if (video.tagName === 'VIDEO') {
      setTimeout(() => {
        loadingDisplay.style.display = 'block';
      }, 100);
    }
  }

  // Set timeout for stalled error
  function maxLoadTime() {
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      showMessage('An error occurred while loading the video.');
    }, 1000 * 10); // 10 seconds
  }

  try {
    // Initial UI update
    updateSliderBackground(seekerBar);
    updateSliderBackground(volumeBar);
    updateTimestamps(video, controls);

    const handleReady = () => {
      const currentState = playerStateMachine.getState('playback');
      if (currentState === states.LOADING || currentState === states.IDLE) {
        if (!isNaN(video.duration) && video.duration > 0) {
          playerStateMachine.setState('playback', states.READY);
          videoLoaded();
          video.removeEventListener('loadedmetadata', handleReady);
        }
      }
    };

    // Vertical video fill
    if (config.useVerticalVidFill) {
      const resizeObserver = new ResizeObserver(() => resizeCanvas(mediaContainer));
      resizeObserver.observe(mediaContainer);
    }

    // Destroy player on page unload
    window.addEventListener('beforeunload', () => {
      if (opid) destroyPlayer(opid);
    });

    // Click media container listener
    mediaContainer.addEventListener('click', (e) => {
      if (e.target === video) {
        video.focus();
        togglePlayPause(video);
      }
    });

    // Mouse event listeners
    if (config.mouseEvent && video.tagName === 'VIDEO') {
      video.addEventListener('pause', () => showControls(video, videoControls));
      mediaContainer.addEventListener("mousemove", debounce(() => handleMouseMove(video, videoControls), 40));
      videoControls.addEventListener("mouseleave", () => handleMouseMove(video, videoControls));
      videoControls.addEventListener("click", () => clearTimeout(mouseMoveTimer));
      videoControls.addEventListener("mousemove", debounce(() => handleMouseMove(video, videoControls), 20));
      videoControls.addEventListener("mouseenter", () => {
        showControls(video, videoControls);
        clearTimeout(mouseMoveTimer);
      });
    }
    
    // Video event listeners
    video.addEventListener('fullscreenchange', () => updateUI(video, controls, playerStateMachine));
    video.addEventListener('progress', () => updateSliderBackground(seekerBar));
    video.addEventListener('canplaystart', () => videoLoaded());
    video.addEventListener('canplay', handleReady());
    video.addEventListener('loadeddata', handleReady());
    video.addEventListener('loadedmetadata', () => handleReady());
    video.addEventListener('emptied', () => video.pause());
    
    video.addEventListener('encrypted', () => console.warn('Media is encrypted.'));
    video.addEventListener('fullscreenerror', () => console.error('Fullscreen error.'));

    video.addEventListener('ended', () => {
      playerStateMachine.setState('playback', states.ENDED);
      if (playerStateMachine.getState('loop') === states.LOOPING) {
        video.currentTime = 0.2;
        video.play().catch(e => console.error(`Player ${opid}: Error restarting loop:`, e));
      } else {
        requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
      }
    });

    video.addEventListener('playing', () => {
      playerStateMachine.setState('playback', states.PLAYING);
      videoLoaded();
      requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
    });

    video.addEventListener('pause', () => {
      if (playerStateMachine.getState('playback') !== states.ENDED && playerStateMachine.getState('seeking') !== states.SEEKING) {
        playerStateMachine.setState('playback', states.PAUSED);
      }
      requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
      if (config.mouseEvent) showControls(video, videoControls);
    });

    video.addEventListener('timeupdate', () => {
      if (playerStateMachine.getState('seeking') !== states.SEEKING && !isNaN(video.duration) && video.duration > 0) {
        updateSeekerBarVisuals(video, controls.seekerBar, playerStateMachine);
        updateTimestamps(video, controls);
      } else if (playerStateMachine.getState('seeking') === states.SEEKING) {
        updateTimestamps(video, controls);
      }
      updateSliderBackground(seekerBar);
    });

    // Loading video
    video.addEventListener('stalled', () => showLoading());
    video.addEventListener("loadstart", () => showLoading());

    video.addEventListener('waiting', () => {
      const currentState = playerStateMachine.getState('playback');
      if (currentState === states.PLAYING || currentState === states.SEEKING || currentState === states.LOADING) {
        showLoading();
        maxLoadTime();
      }
    });

    // Button clicks
    controls.videoControls.addEventListener('click', (event) => {
      try {
        const target = event.target.closest('.osp-button');
        if (!target) return;
      
        if (target === playPauseBtn || target.closest('.osp-play-pause')) {
          togglePlayPause(video);
        } else if (target === muteBtn || target.closest('.osp-mute')) {
          toggleMute(video);
        } else if (target === fullScreenBtn || target.closest('.osp-fullscreen')) {
          toggleFullscreen(mediaContainer, video);
        } else if (target === cinematicModeBtn || target.closest('.osp-cinema-button')) {
          toggleCinematicMode(video);
        } else if (target === subtitleButton || target.closest('.osp-subtitle')) {
          toggleSubtitles(mediaContainer, video, subtitleButton);
        } else if (target === settingsButton || target.closest('.osp-settings-button')) {
          toggleSettingsMenu(video, settingsMenu, settingsButton);
        } else if (target === fastForwardBtn || target.closest('.osp-fast-forward')) {
          if (config.useFastForward) {
            skipForward(video);
            requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
            prefetchNextSegment(video);
          }
        }
  
        requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
      } catch (error) {
        console.error('An error occurred:', error);
      }
    });

    // Bars
    volumeBar.addEventListener('input', () => {
      video.volume = volumeBar.value;
      video.muted = video.volume === 0 ? true : false;
      updateSliderBackground(volumeBar);
      updateUI(video, controls, playerStateMachine);
    });

    seekerBar.addEventListener('mousedown', () => {
      if (!isNaN(video.duration) && video.duration > 0) {
        playerStateMachine.setState('seeking', states.SEEKING);
        if (playerStateMachine.getState('playback') === states.PLAYING) {
          video.pause();
        }
        window.addEventListener('mouseup', handleSeekMouseUp, true);
      }
    });

    const handleSeekMouseUp = () => {
      if (playerStateMachine.getState('seeking') === states.SEEKING) {
        playerStateMachine.setState('seeking', states.IDLE);
        window.removeEventListener('mouseup', handleSeekMouseUp, true);
        if (playerStateMachine.getState('playback') === states.PLAYING && video.paused && !video.ended) {
          video.play().catch(e => console.error(`Player ${opid}: Error resuming after seek:`, e));
        } else {
          requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
        }
      }
    };
  
    seekerBar.addEventListener('input', () => {
      if (config.mouseEvent) handleMouseMove(video, videoControls);
    
      const newTime = (seekerBar.value / 100) * video.duration;
      if (!isNaN(video.duration) && video.duration > 0) {
        video.currentTime = newTime;
      }
      updateSliderBackground(seekerBar);
      updateTimestamps(video, controls);
    });

    // Keyboard Shortcuts
    mediaContainer.addEventListener('keydown', (event) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) return;
      if (document.activeElement !== mediaContainer && !mediaContainer.contains(document.activeElement)) return;
      if (playerStateMachine.getState('playback') === states.ERROR || video.error) return;

      if (config.mouseEvent) handleMouseMove(video, videoControls);

      switch (event.key) {
        case ' ':
        case 'Spacebar':
        case 'Space':
          event.preventDefault();
          togglePlayPause(video);
          break;
        case 'ArrowUp':
          event.preventDefault();
          increaseVolume(video);
          updateSliderBackground(volumeBar);
          break;
        case 'ArrowDown':
          event.preventDefault();
          decreaseVolume(video);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          skipBackward(video);
          break;
        case 'ArrowRight':
          event.preventDefault();
          skipForward(video);
          break;
        case 'f':
        case 'F':
          toggleFullscreen(mediaContainer, video);
          break;
        case 'm':
        case 'M':
          toggleMute(video);
          break;
        case 'c':
        case 'C':
          toggleCinematicMode(video);
          break;
        case 's':
        case 'S':
          toggleSubtitles(mediaContainer, video, subtitleButton);
          break;
        case 't':
        case 'T':
          toggleSettingsMenu(video, settingsMenu, settingsButton);
          break;
        default:
          break;
      }

      requestAnimationFrame(() => updateUI(video, controls, playerStateMachine));
    });

    // Keyboard Shortcuts for Seekbar
    seekerBar.addEventListener('keydown', (event) => {
      if (document.activeElement !== mediaContainer && !mediaContainer.contains(document.activeElement)) return;
      if (playerStateMachine.getState('playback') === states.ERROR || video.error) return;

      if (config.mouseEvent) handleMouseMove(video, videoControls);
      switch (event.key) {
        case ' ':
        case 'Spacebar':
        case 'Space':
          event.preventDefault();
          togglePlayPause(video);
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          event.preventDefault();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          skipBackward(video);
          prefetchNextSegment(video);
          break;
        case 'ArrowRight':
          event.preventDefault();
          skipForward(video);
          prefetchNextSegment(video);
          break;
        default:
          break;
      }
    });
    
  } catch (error) {
    console.error('An error occurred:', error);
    showMessage('An error occurred while loading the video.');
  }
}