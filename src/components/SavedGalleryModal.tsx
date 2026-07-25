import React, { useState } from 'react';
import { SceneBrief } from '../types';
import { X, Trash2, BookOpen, Sparkles, Compass } from 'lucide-react';

interface SavedGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBriefs: SceneBrief[];
  onSelectBrief: (brief: SceneBrief) => void;
  onDeleteBrief: (id: string) => void;
}

export const SavedGalleryModal: React.FC<SavedGalleryModalProps> = ({
  isOpen,
  onClose,
  savedBriefs,
  onSelectBrief,
  onDeleteBrief,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = savedBriefs.filter((b) =>
    b.variant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.variant.pitch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] border border-white/70 bg-white/90">
        {/* Modal Header */}
        <div className="bg-white/40 backdrop-blur-md px-6 py-4 border-b border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">Saved Artist Briefs Gallery</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/60 text-slate-700 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white/30 border-b border-white/40">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved artist briefs..."
            className="w-full px-5 py-3 rounded-full bg-white border border-slate-300 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
          />
        </div>

        {/* List Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500">
              <Sparkles className="w-12 h-12 text-amber-500 mb-3" />
              <p className="font-extrabold text-slate-800 text-base">No saved briefs found</p>
              <p className="text-xs font-medium text-slate-600 mt-1 max-w-xs">
                Save artist briefs to review composition guides, palettes, and stuck exchanges anytime.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((brief) => (
                <div
                  key={brief.id}
                  className="bg-white/80 hover:bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 transition flex flex-col justify-between gap-3 group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">
                        {brief.variant.title}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                        Medium: {brief.medium} • {new Date(brief.createdAt).toLocaleDateString()}
                      </span>
                      {brief.stuck_exchanges && brief.stuck_exchanges.length > 0 && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1">
                          {brief.stuck_exchanges.length} Stuck Exchange(s)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBrief(brief.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                      title="Delete brief"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thumbnail SVG */}
                  <div className="w-full aspect-[280/200] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-1">
                    <svg
                      viewBox="0 0 280 200"
                      className="w-full h-full object-contain"
                      dangerouslySetInnerHTML={{ __html: brief.variant.thumbnail_svg }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      onSelectBrief(brief);
                      onClose();
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Open Artist Brief
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
