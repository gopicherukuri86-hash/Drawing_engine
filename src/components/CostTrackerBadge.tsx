import React, { useState, useEffect } from 'react';
import { getCostStats, setCapReleased, CostStats } from '../utils/costTracker';
import { DollarSign, ShieldAlert, Lock, Unlock, HelpCircle, X, Sparkles } from 'lucide-react';

interface CostTrackerBadgeProps {
  onStatsChange?: (stats: CostStats) => void;
}

export const CostTrackerBadge: React.FC<CostTrackerBadgeProps> = ({ onStatsChange }) => {
  const [stats, setStats] = useState<CostStats>(getCostStats());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      const s = getCostStats();
      setStats(s);
      if (onStatsChange) onStatsChange(s);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [onStatsChange]);

  const handleToggleRelease = () => {
    const newStats = setCapReleased(!stats.capReleased);
    setStats(newStats);
    if (onStatsChange) onStatsChange(newStats);
  };

  const percentage = Math.min(100, Math.round((stats.todayCost / stats.dailyCapLimit) * 100));

  return (
    <>
      {/* Persistent Top Badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-2 shadow-sm ${
          stats.isCapReached
            ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
            : stats.capReleased
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            : 'bg-slate-900/90 text-amber-300 border-slate-700 hover:bg-slate-900'
        }`}
        title="Click to view Gemini API Cost & Daily Hard Cap Tracker"
      >
        <div className="flex items-center gap-1">
          {stats.isCapReached ? (
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
          ) : (
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Today: ${stats.todayCost.toFixed(2)}</span>
          <span className="opacity-60 text-[10px]">/ ${stats.dailyCapLimit.toFixed(2)}</span>
        </div>

        {/* Progress Mini Bar */}
        <div className="w-10 h-1.5 bg-white/20 rounded-full overflow-hidden hidden sm:block">
          <div
            className={`h-full transition-all duration-300 ${
              stats.isCapReached
                ? 'bg-white'
                : percentage > 80
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {stats.capReleased && (
          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-extrabold uppercase hidden md:inline">
            Cap Unlocked
          </span>
        )}
      </button>

      {/* Detailed Modal / Popover */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">API Spending Tracker</h3>
                <p className="text-xs text-slate-500 font-medium">Gemini Image Generation Cost & Hard Cap</p>
              </div>
            </div>

            {/* Cost Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Today's Spend</span>
                <span className="text-xl font-black text-slate-900">${stats.todayCost.toFixed(3)}</span>
                <span className="text-xs text-slate-600 font-semibold">{stats.todayImageCount} pictures generated</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Daily Hard Limit</span>
                <span className="text-xl font-black text-slate-900">${stats.dailyCapLimit.toFixed(2)}</span>
                <span className="text-xs text-slate-600 font-semibold">~20 pictures / day</span>
              </div>
            </div>

            {/* Breakdown & Rate Info */}
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-xs text-amber-950 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Exact Cost Breakdown</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium pl-1">
                <li>Cost per image generated: <strong>~$0.025 USD</strong> (2.5 cents)</li>
                <li>16 images generated today = <strong>~$0.400 USD</strong></li>
                <li>Lifetime images total: <strong>{stats.lifetimeImageCount} (~${stats.lifetimeCost.toFixed(2)})</strong></li>
              </ul>
            </div>

            {/* Hard Cap Controls */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">50¢ Daily Hard Cap</h4>
                  <p className="text-xs text-slate-500">
                    {stats.capReleased
                      ? 'Daily limit is currently RELEASED. Unlimited generations allowed.'
                      : 'Protects key from exceeding $0.50 per day.'}
                  </p>
                </div>

                <div className="flex items-center gap-1 font-bold text-xs">
                  {stats.capReleased ? (
                    <span className="text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Unlock className="w-3.5 h-3.5" /> Released
                    </span>
                  ) : (
                    <span className="text-slate-700 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                      <Lock className="w-3.5 h-3.5" /> Active ($0.50)
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleToggleRelease}
                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                  stats.capReleased
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {stats.capReleased ? (
                  <>
                    <Lock className="w-4 h-4" /> Re-Enable $0.50 Daily Limit
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Release Cap for Today (Allow More Images)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
