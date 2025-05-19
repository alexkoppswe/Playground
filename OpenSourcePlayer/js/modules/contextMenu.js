//  contextMenu.js

/*========// Context Menu Module //=========
  1. Initializes the context menu functionality (UI, event listeners) function
  2. Handles click events on the context menu items
  3. Hide menu function
  4. Shows menu function
  5. Helper function to get elements
  ========================================== */

import { config } from './OpenSourcePlayer.js';
import { handleMouseMove } from './mouseEvents.js';
import { togglePlayPause, toggleFullscreen, toggleLoop, togglePip } from './videoInput.js';

let mouseMoveTimer;

// Main function
export function initializeContextMenu(video, videoPlayerContainer, videoControls) {
  if (!config.useContextMenu || video.tagName !== 'VIDEO') return;

  const aboutUrl = 'github.com/280studios/opensourceplayer';
  const contextMenuHtml = `
    <div class="osp-context" role="menu" aria-label="Context Menu">
      <span class="contextPlayPause" role="menuitem" aria-label="Play/Pause">&#9658; Play/Pause</span>
      <span class="contextFullscreen" role="menuitem" aria-label="Fullscreen">&#9974; Fullscreen</span>
      <span class="contextLoop" role="menuitem" aria-label="Loop">&#8634; Loop</span>
      <span class="contextPip" role="menuitem" aria-label="Picture-in-Picture" title="Picture-in-Picture">&#9714; Pip</span>
      <span class="contextAbout" role="menuitem" aria-label="About">&#10082; About</span>
      <span class="contextAboutWindow"><a href="https://${aboutUrl}" target="_blank" title="@${aboutUrl}">Open Source Player v1.6</a></span>
    </div>
  `;
  videoPlayerContainer.insertAdjacentHTML('beforeend', contextMenuHtml);

  const contextMenu = getElement('.osp-context', videoPlayerContainer);
  const loopButton = getElement('.contextLoop', contextMenu);
  const aboutWindow = contextMenu.querySelector('.contextAboutWindow');

  // Event listeners
  document.addEventListener('click', (event) => hideCustomMenuOutside(event, contextMenu));
  window.addEventListener('resize', () => hideContextMenu(contextMenu));
  window.addEventListener('scroll', () => hideContextMenu(contextMenu));

  videoPlayerContainer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    hideCustomMenuOutside(event, contextMenu);
    showCustomMenu(event, contextMenu, aboutWindow);
  });

  contextMenu.addEventListener('mousemove', () => handleMouseMove(video, videoControls));
  contextMenu.addEventListener('mouseenter', () => clearTimeout(mouseMoveTimer));
  contextMenu.addEventListener('click', (event) => handleContextMenuClick(event, video, videoPlayerContainer, contextMenu, aboutWindow, loopButton));
}

// Handle click events
function handleContextMenuClick(event, video, videoPlayerContainer, contextMenu, aboutWindow, loopButton) {
  const target = event.target;
  if (target.classList.contains('contextPlayPause')) {
    togglePlayPause(video);
    hideContextMenu(contextMenu);
  } else if (target.classList.contains('contextFullscreen')) {
    toggleFullscreen(videoPlayerContainer, video);
    hideContextMenu(contextMenu);
  } else if (target.classList.contains('contextLoop')) {
    toggleLoop(video);
    loopButton.textContent = loopButton.textContent === '↺ Loop' ? '⥀ Looped' : '↺ Loop';
    hideContextMenu(contextMenu);
  } else if (target.classList.contains('contextPip')) {
    togglePip(video);
    hideContextMenu(contextMenu);
  } else if (target.classList.contains('contextAbout')) {
    aboutWindow.style.display = 'block';
  }
}

// Hide menu
function hideCustomMenuOutside(event, contextMenu) {
  if (!contextMenu.contains(event.target)) {
    hideContextMenu(contextMenu);
  }
}

function hideContextMenu(contextMenu) {
  contextMenu.classList.remove('visible');
}

// Show menu
function showCustomMenu(event, contextMenu, aboutWindow) {
  contextMenu.style.top = `${event.clientY}px`;
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.classList.add('visible');
  aboutWindow.style.display = 'none';
}

// Helper
function getElement(selector, parent = document) {
  return parent.querySelector(selector);
}
