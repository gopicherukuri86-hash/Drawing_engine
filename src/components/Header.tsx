import React from 'react';
import { Palette, BookOpen, BookmarkPlus, Sparkles, PlusCircle } from 'lucide-react';
import { CostTrackerBadge } from './CostTrackerBadge';

interface HeaderProps {
  onOpenGallery: () => void;
  savedCount: number;
  onNewTutorial: () => void;
  onSaveCurrent: () => void;
  canSave: boolean;
  isSaved: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGallery,
  savedCount,
  onNewTutorial,
  onSaveCurrent,
  canSave,
  isSaved,
}) => {
  return (
    <header className="w-full bg-white/30 backdrop-blur-xl border-b border-white/40 sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-sm transition">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo and Tagline */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={onNewTutorial}>
          <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/60 shadow-sm text-indigo-600">
            <Palette className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-800 text-lg sm:text-xl tracking-tight">
                Reconstructive Drawing Engine
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-sm">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Artist Studio
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 hidden sm:block">
              Deconstruct reference images and subjects into structured drawing steps
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CostTrackerBadge />

          {canSave && (
            <button
              onClick={onSaveCurrent}
              disabled={isSaved}
              className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
                isSaved
                  ? 'bg-emerald-100/80 text-emerald-900 border border-emerald-200'
                  : 'bg-yellow-400 hover:bg-yellow-300 text-yellow-950 shadow-md shadow-yellow-200'
              }`}
            >
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden xs:inline">{isSaved ? 'Saved to Gallery' : 'Save Tutorial'}</span>
            </button>
          )}

          <button
            onClick={onOpenGallery}
            className="px-4 sm:px-5 py-2.5 rounded-full bg-white/40 backdrop-blur-md border border-white/50 hover:bg-white/70 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 relative shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Gallery</span>
            {savedCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={onNewTutorial}
            className="px-5 sm:px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200/80 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden xs:inline">New Drawing</span>
          </button>
        </div>
      </div>
    </header>
  );
};
