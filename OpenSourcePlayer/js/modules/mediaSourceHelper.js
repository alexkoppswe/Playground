// mediaSourceHelper.js

/*======// MediaSource //======
  1. MediaSource Setup
    -Event Listener

  * NOTE: Not fully implemented, you need to add your own code to handle the MediaSource.
============================= */

export function setupMediaSource(video, videoSrc, type) {
  if (!('MediaSource' in window)) {
    console.warn('MediaSource not supported');
    return false;
  }

  if (!type || typeof type !== 'string') {
    console.warn(`Media Type Check: Invalid type string provided: ${type}`);
    return false;
  }

  if (videoSrc && typeof videoSrc.canPlayType === 'function') {
    const supportLevel = videoSrc.canPlayType(type);
    if (supportLevel === '') {
      console.warn(`Media Type Check: Unsupported media type: ${type}`);
      return false;
    }
  }

  const mediaSource = new MediaSource();
  if (!mediaSource) return;

  video.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen', async () => {
    try {
      const sourceBuffer = mediaSource.addSourceBuffer(type);
      console.log('Source buffer added.');
  
      sourceBuffer.addEventListener('updateend', () => {
        console.log('Source buffer update complete.');
      });
    } catch (error) {
      console.error('Error adding source buffer:', error);
    }
  });
}
