import React, { useState } from 'react';
import { DrawingTutorial } from '../types';
import { X, Trash2, Play, Sparkles, BookOpen } from 'lucide-react';
import { sanitizeSvg } from '../utils/sanitizeSvg';

interface SavedGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTutorials: DrawingTutorial[];
  onSelectTutorial: (tutorial: DrawingTutorial) => void;
  onDeleteTutorial: (id: string) => void;
}

export const SavedGalleryModal: React.FC<SavedGalleryModalProps> = ({
  isOpen,
  onClose,
  savedTutorials,
  onSelectTutorial,
  onDeleteTutorial,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = savedTutorials.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] border border-white/70">
        {/* Modal Header */}
        <div className="bg-white/30 backdrop-blur-md px-6 py-4 border-b border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-extrabold text-slate-800">My Saved Drawing Gallery</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/40 text-slate-700 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white/20 border-b border-white/40">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved drawings..."
            className="w-full px-5 py-3 rounded-full bg-white/60 backdrop-blur-md border border-white/70 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white shadow-inner"
          />
        </div>

        {/* List Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500">
              <Sparkles className="w-12 h-12 text-amber-400 mb-3" />
              <p className="font-extrabold text-slate-800 text-base">No saved tutorials found</p>
              <p className="text-xs font-medium text-slate-600 mt-1 max-w-xs">
                When you generate or open drawing guides, click "Save Tutorial" to keep them in your personal gallery!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((tutorial) => {
                const finalStepSvg = sanitizeSvg(tutorial.steps.map((s) => s.svg_code).join('\n'));
                return (
                  <div
                    key={tutorial.id}
                    className="bg-white/40 hover:bg-white/70 backdrop-blur-md border border-white/60 hover:border-amber-400 rounded-2xl p-4 transition flex flex-col justify-between gap-3 group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">
                          {tutorial.title}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                          {tutorial.steps.length} Steps • {new Date(tutorial.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTutorial(tutorial.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                        title="Delete saved tutorial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Preview Thumbnail */}
                    <div className="w-full aspect-square bg-white/80 backdrop-blur-sm rounded-xl border border-white/80 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                      <svg
                        viewBox="0 0 500 500"
                        className="w-full h-full object-contain"
                        xmlns="http://www.w3.org/2000/svg"
                        dangerouslySetInnerHTML={{ __html: finalStepSvg }}
                      />
                    </div>

                    <button
                      onClick={() => {
                        onSelectTutorial(tutorial);
                        onClose();
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 transition active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Open Drawing Tutorial
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
