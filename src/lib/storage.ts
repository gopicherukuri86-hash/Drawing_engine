import { SceneBrief } from '../types';

const DB_NAME = 'ArtStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_briefs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Downscale a base64 or Data URL image to max 800px on long edge at JPEG 0.75 quality
 */
export async function downscaleImage(dataUrl: string, maxDimension = 800, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const downscaled = canvas.toDataURL('image/jpeg', quality);
      resolve(downscaled);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function getSavedBriefs(): Promise<SceneBrief[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as SceneBrief[];
        // Sort descending by createdAt
        results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to read from IndexedDB, falling back to localStorage:', err);
    try {
      const stored = localStorage.getItem('reconstructive_scene_briefs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

export async function saveBriefToStorage(brief: SceneBrief): Promise<SceneBrief[]> {
  // Deep clone and downscale image if present
  const briefToSave: SceneBrief = JSON.parse(JSON.stringify(brief));
  if (briefToSave.image) {
    briefToSave.image = await downscaleImage(briefToSave.image, 800, 0.75);
  }
  if (briefToSave.variant && briefToSave.variant.image) {
    briefToSave.variant.image = await downscaleImage(briefToSave.variant.image, 800, 0.75);
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(briefToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
  }

  return getSavedBriefs();
}

export async function deleteBriefFromStorage(id: string): Promise<SceneBrief[]> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to delete from IndexedDB:', err);
  }

  return getSavedBriefs();
}
