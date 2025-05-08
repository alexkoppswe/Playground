//  preload.js
import { config } from './OpenSourcePlayer.js';

if (config.useSvgIcons) {
  preloadResources(['assets/icons.svg'], 'svg-icons');
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