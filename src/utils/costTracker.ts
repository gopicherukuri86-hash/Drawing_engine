// Cost Tracker Utility for Gemini Image Generation API
// Cost model: ~$0.025 (2.5 cents) per image generated with Gemini/Imagen models

const COST_PER_IMAGE = 0.025; // $0.025 USD
const DEFAULT_DAILY_CAP = 0.50; // $0.50 USD hard cap per day
const INITIAL_BASELINE_IMAGES = 16; // User noted 16 images generated so far

const STORAGE_KEY = 'artist_studio_gemini_cost_tracker_v1';

export interface CostStats {
  todayDate: string;
  todayImageCount: number;
  todayCost: number; // in USD
  dailyCapLimit: number; // in USD
  capReleased: boolean;
  isCapReached: boolean;
  lifetimeImageCount: number;
  lifetimeCost: number;
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getCostStats(): CostStats {
  const todayStr = getTodayString();
  const raw = localStorage.getItem(STORAGE_KEY);

  let data = {
    date: todayStr,
    todayImageCount: INITIAL_BASELINE_IMAGES,
    capReleased: false,
    lifetimeImageCount: INITIAL_BASELINE_IMAGES,
  };

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayStr) {
        data.todayImageCount = typeof parsed.todayImageCount === 'number' ? parsed.todayImageCount : INITIAL_BASELINE_IMAGES;
        data.capReleased = !!parsed.capReleased;
      } else {
        // New day reset daily count, keep cap lock default
        data.todayImageCount = 0;
        data.capReleased = false;
      }
      data.lifetimeImageCount = typeof parsed.lifetimeImageCount === 'number' ? parsed.lifetimeImageCount : INITIAL_BASELINE_IMAGES;
    } catch (e) {
      console.warn('Error reading cost tracker storage:', e);
    }
  } else {
    // Save initial state
    saveCostData(data);
  }

  const todayCost = data.todayImageCount * COST_PER_IMAGE;
  const lifetimeCost = data.lifetimeImageCount * COST_PER_IMAGE;
  const isCapReached = todayCost >= DEFAULT_DAILY_CAP && !data.capReleased;

  return {
    todayDate: todayStr,
    todayImageCount: data.todayImageCount,
    todayCost: parseFloat(todayCost.toFixed(3)),
    dailyCapLimit: DEFAULT_DAILY_CAP,
    capReleased: data.capReleased,
    isCapReached,
    lifetimeImageCount: data.lifetimeImageCount,
    lifetimeCost: parseFloat(lifetimeCost.toFixed(3)),
  };
}

function saveCostData(data: { date: string; todayImageCount: number; capReleased: boolean; lifetimeImageCount: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Error saving cost tracker storage:', e);
  }
}

export function recordImageGeneration(count = 1): CostStats {
  const stats = getCostStats();
  const todayStr = getTodayString();

  const updatedData = {
    date: todayStr,
    todayImageCount: stats.todayImageCount + count,
    capReleased: stats.capReleased,
    lifetimeImageCount: stats.lifetimeImageCount + count,
  };

  saveCostData(updatedData);
  return getCostStats();
}

export function setCapReleased(released: boolean): CostStats {
  const stats = getCostStats();
  const todayStr = getTodayString();

  const updatedData = {
    date: todayStr,
    todayImageCount: stats.todayImageCount,
    capReleased: released,
    lifetimeImageCount: stats.lifetimeImageCount,
  };

  saveCostData(updatedData);
  return getCostStats();
}

export function checkCapAllowed(): { allowed: boolean; stats: CostStats } {
  const stats = getCostStats();
  return {
    allowed: !stats.isCapReached,
    stats,
  };
}
