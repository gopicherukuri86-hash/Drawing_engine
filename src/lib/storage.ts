import { SceneBrief, SceneVariant } from '../types';

const DB_NAME = 'ArtStudioDB';
const DB_VERSION = 2;
const STORE_NAME = 'saved_briefs';
const STORE_VARIANTS = 'generated_variants';

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
      if (!db.objectStoreNames.contains(STORE_VARIANTS)) {
        db.createObjectStore(STORE_VARIANTS, { keyPath: 'id' });
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

/**
 * Recursively walk an object/array and downscale any string field starting with "data:image/"
 */
export async function downscaleObjectImages<T>(obj: T, maxDimension = 800, quality = 0.75): Promise<T> {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && (obj as string).startsWith('data:image/')) {
      return (await downscaleImage(obj as string, maxDimension, quality)) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    const arrayResult = await Promise.all(
      obj.map((item) => downscaleObjectImages(item, maxDimension, quality))
    );
    return arrayResult as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj as Record<string, any>)) {
    const val = (obj as Record<string, any>)[key];
    if (typeof val === 'string' && val.startsWith('data:image/')) {
      result[key] = await downscaleImage(val, maxDimension, quality);
    } else if (typeof val === 'object' && val !== null) {
      result[key] = await downscaleObjectImages(val, maxDimension, quality);
    } else {
      result[key] = val;
    }
  }

  return result as T;
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
  // Deep clone and downscale all base64 images present anywhere in brief
  const briefToSave: SceneBrief = await downscaleObjectImages(JSON.parse(JSON.stringify(brief)));

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

/**
 * Cache a generated SceneVariant to IndexedDB, downscaling images first
 */
export async function saveVariantToCache(variant: SceneVariant): Promise<void> {
  if (!variant || !variant.id) return;

  const variantToSave: SceneVariant = await downscaleObjectImages(JSON.parse(JSON.stringify(variant)));
  if (!variantToSave.createdAt) {
    variantToSave.createdAt = new Date().toISOString();
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VARIANTS, 'readwrite');
      const store = tx.objectStore(STORE_VARIANTS);
      const request = store.put(variantToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save variant to IndexedDB cache:', err);
  }
}

/**
 * Get a cached variant by ID from IndexedDB
 */
export async function getVariantFromCache(variantId: string): Promise<SceneVariant | null> {
  if (!variantId) return null;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VARIANTS, 'readonly');
      const store = tx.objectStore(STORE_VARIANTS);
      const request = store.get(variantId);

      request.onsuccess = () => resolve((request.result as SceneVariant) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get variant from IndexedDB cache:', err);
    return null;
  }
}

/**
 * Get all cached scene variants from IndexedDB sorted by date
 */
export async function getCachedVariants(): Promise<SceneVariant[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VARIANTS, 'readonly');
      const store = tx.objectStore(STORE_VARIANTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []) as SceneVariant[];
        results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get cached variants from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a cached variant by ID from IndexedDB
 */
export async function deleteVariantFromCache(variantId: string): Promise<SceneVariant[]> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VARIANTS, 'readwrite');
      const store = tx.objectStore(STORE_VARIANTS);
      const request = store.delete(variantId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to delete variant from IndexedDB cache:', err);
  }

  return getCachedVariants();
}
