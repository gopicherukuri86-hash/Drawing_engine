import React, { useState, useEffect, useCallback } from 'react';
import { SceneBrief, SceneVariant } from '../types';
import { X, Trash2, BookOpen, Sparkles, Compass, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { getCachedVariants, deleteVariantFromCache } from '../lib/storage';

interface SavedGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBriefs: SceneBrief[];
  cachedVariants?: SceneVariant[];
  onSelectBrief: (brief: SceneBrief) => void;
  onSelectVariant?: (variant: SceneVariant) => void;
  onDeleteBrief: (id: string) => void;
  onDeleteVariant?: (id: string) => void;
  onRefreshVariants?: () => void;
}

export const SavedGalleryModal: React.FC<SavedGalleryModalProps> = ({
  isOpen,
  onClose,
  savedBriefs,
  cachedVariants: propsCachedVariants,
  onSelectBrief,
  onSelectVariant,
  onDeleteBrief,
  onDeleteVariant,
  onRefreshVariants,
}) => {
  const [activeTab, setActiveTab] = useState<'briefs' | 'variants'>('briefs');
  const [searchTerm, setSearchTerm] = useState('');
  const [localCachedVariants, setLocalCachedVariants] = useState<SceneVariant[]>([]);

  const reloadVariants = useCallback(async () => {
    try {
      const list = await getCachedVariants();
      setLocalCachedVariants(list);
    } catch (err) {
      console.warn('Failed to load cached variants in modal:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      reloadVariants();
    }
  }, [isOpen, reloadVariants]);

  if (!isOpen) return null;

  const displayVariants = propsCachedVariants || localCachedVariants;

  const filteredBriefs = savedBriefs.filter(
    (b) =>
      b.variant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.variant.pitch && b.variant.pitch.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredVariants = displayVariants.filter(
    (v) =>
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.pitch && v.pitch.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteVariantItem = async (id: string) => {
    if (onDeleteVariant) {
      onDeleteVariant(id);
    }
    const updated = await deleteVariantFromCache(id);
    setLocalCachedVariants(updated);
    if (onRefreshVariants) {
      onRefreshVariants();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] border border-white/70 bg-white/95">
        {/* Modal Header */}
        <div className="bg-white/60 backdrop-blur-md px-6 py-4 border-b border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Art Studio Vault & Gallery</h2>
              <p className="text-xs font-semibold text-slate-500">
                Browse saved briefs and cached scene takes offline without using API balance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 text-slate-700 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex bg-slate-200/80 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('briefs')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'briefs'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Saved Briefs</span>
              <span className="ml-1 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px]">
                {savedBriefs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('variants')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'variants'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Cached Scene Takes</span>
              <span className="ml-1 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px]">
                {displayVariants.length}
              </span>
            </button>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'briefs'
                ? 'Search saved briefs...'
                : 'Search cached scene takes...'
            }
            className="w-full sm:max-w-xs px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
          />
        </div>

        {/* List Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'briefs' ? (
            filteredBriefs.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500">
                <Sparkles className="w-12 h-12 text-amber-500 mb-3" />
                <p className="font-extrabold text-slate-800 text-base">No saved briefs found</p>
                <p className="text-xs font-medium text-slate-600 mt-1 max-w-xs">
                  Save artist briefs to review composition guides, palettes, and stuck exchanges anytime.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredBriefs.map((brief) => (
                  <div
                    key={brief.id}
                    className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 transition flex flex-col justify-between gap-3 group shadow-sm"
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

                    {/* Image or SVG preview */}
                    <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                      {brief.image ? (
                        <img
                          src={brief.image}
                          alt={brief.variant.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          viewBox="0 0 280 200"
                          className="w-full h-full object-contain p-1"
                          dangerouslySetInnerHTML={{ __html: brief.variant.thumbnail_svg || '' }}
                        />
                      )}
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
            )
          ) : (
            /* Cached Scene Takes Tab */
            filteredVariants.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500">
                <ImageIcon className="w-12 h-12 text-indigo-400 mb-3" />
                <p className="font-extrabold text-slate-800 text-base">No cached scene takes</p>
                <p className="text-xs font-medium text-slate-600 mt-1 max-w-xs">
                  Whenever scene pictures are generated, they are automatically saved to your local storage cache for instant re-use!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredVariants.map((varItem) => {
                  const displayImg = varItem.image || varItem.image_url;
                  const isSquare = varItem.aspect === '1:1';

                  return (
                    <div
                      key={varItem.id}
                      className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 transition flex flex-col justify-between gap-3 shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm truncate">
                              {varItem.title}
                            </h3>
                            <span className="text-[9px] font-extrabold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                              {varItem.aspect || '4:3'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 font-medium">
                            {varItem.description || varItem.pitch}
                          </p>
                          {varItem.createdAt && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cached {new Date(varItem.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVariantItem(varItem.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition shrink-0"
                          title="Remove from local cache"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Image Preview */}
                      <div
                        className={`w-full ${
                          isSquare ? 'aspect-square' : 'aspect-[4/3]'
                        } bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative`}
                      >
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={varItem.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="w-full h-full p-2"
                            dangerouslySetInnerHTML={{ __html: varItem.thumbnail_svg || '' }}
                          />
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (onSelectVariant) {
                            onSelectVariant(varItem);
                            onClose();
                          }
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Select & Generate Brief
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
