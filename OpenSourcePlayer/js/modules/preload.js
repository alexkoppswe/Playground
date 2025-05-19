//  preload.js
import { config } from './OpenSourcePlayer.js';
import { iconPath } from './controls.js';

// Check if SVG icons exists (for debugging, not required in production)
if (config.useSvgIcons && config.debugger) {
  if (checkSvgIconsLoaded(iconPath)) {
    console.log('SVG icons loaded successfully');
  } else {
    console.error('Failed to load SVG icons. Check path or network.');
  }
}

// Preload SVG icons
if (config.useSvgIcons) {
  preloadResources([iconPath], 'svg-icons');
}

// Preload resources
async function preloadResources(resources, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    await Promise.all(resources.map(async (resource) => {
      try {
        const cachedResponse = await cache.match(resource);

        if (!cachedResponse) {
          const headResponse = await fetch(resource, { method: 'HEAD', mode: 'cors' });
          if (!headResponse.ok) {
            throw new Error(`Failed to fetch ${resource}: ${headResponse.status} ${headResponse.statusText}`);
          }

          const response = await fetch(resource, { mode: 'cors', cache: 'force-cache' });
          if (!response.ok) {
            throw new Error(`Failed to fetch ${resource}: ${response.status} ${response.statusText}`);
          }
          
          await cache.put(resource, response);
          if (config.debugger) console.log(`${resource} preloaded into ${cacheName}`);
        }
      } catch (fetchError) {
        console.error(`Error fetching resource ${resource}:`, fetchError);
      }
    }));
  } catch (cacheError) {
    console.error('Error opening cache:', cacheError);
  }
}

// Check if SVG icons exists (path & file)
export async function checkSvgIconsLoaded(svgIconsPath) {
  try {
    const response = await fetch(svgIconsPath, { method: 'HEAD', mode: 'cors' });
    if (!(response.ok && response.status >= 200 && response.status <= 206)) {
      throw new Error(`Failed to load SVG icons: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('image/svg+xml')) {
      throw new Error(`Invalid MIME type for ${svgIconsPath}: ${contentType}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to fetch Svg Icons:', error);
    return false;
  }
}

