import React, { useState, useEffect, useCallback } from 'react';
import { SceneVariant, Style } from '../types';
import { Sparkles, Palette, Loader2, RefreshCw } from 'lucide-react';
import { checkCapAllowed, recordImageGeneration } from '../utils/costTracker';
import { getVariantFromCache, saveVariantToCache } from '../lib/storage';

interface VariantPickerProps {
  variants: SceneVariant[];
  ideaPrompt: string;
  style: Style;
  onSelectVariant: (variant: SceneVariant) => void;
  onBackToInput: () => void;
  isLoading?: boolean;
}

export const VariantPicker: React.FC<VariantPickerProps> = ({
  variants,
  ideaPrompt,
  style,
  onSelectVariant,
  onBackToInput,
  isLoading,
}) => {
  const [variantImages, setVariantImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});

  const fetchSingleVariantImage = useCallback(
    async (v: SceneVariant) => {
      const existingImg = v.image_url || v.image;
      if (existingImg) {
        setVariantImages((prev) => ({ ...prev, [v.id]: existingImg }));
        return;
      }

      // Check IndexedDB cache first
      try {
        const cached = await getVariantFromCache(v.id);
        if (cached && (cached.image || cached.image_url)) {
          const cachedImg = cached.image || cached.image_url!;
          setVariantImages((prev) => ({ ...prev, [v.id]: cachedImg }));
          v.image = cachedImg;
          v.image_url = cachedImg;
          return;
        }
      } catch (cacheErr) {
        console.warn(`Cache lookup failed for variant ${v.id}`, cacheErr);
      }

      const { allowed } = checkCapAllowed();
      if (!allowed) {
        setImageErrors((prev) => ({
          ...prev,
          [v.id]: 'Daily limit reached. Unlock at top bar.',
        }));
        return;
      }

      setLoadingImages((prev) => ({ ...prev, [v.id]: true }));
      setImageErrors((prev) => ({ ...prev, [v.id]: '' }));

      try {
        const res = await fetch('/api/generate-variant-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: v.imagePrompt || `${v.title}. ${v.description}`,
            title: v.title,
            style,
            aspectRatio: v.aspect || v.aspectRatio || '4:3',
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.image) {
          const generatedImg = data.image;
          setVariantImages((prev) => ({ ...prev, [v.id]: generatedImg }));
          v.image = generatedImg;
          v.image_url = generatedImg;
          recordImageGeneration(1);

          // Auto-save generated variant image to IndexedDB cache
          await saveVariantToCache({
            ...v,
            image: generatedImg,
            image_url: generatedImg,
            createdAt: new Date().toISOString(),
          });
        } else {
          throw new Error(data.error || 'Failed to generate image');
        }
      } catch (err: any) {
        console.warn(`Failed fetching image for variant ${v.title}`, err);
        setImageErrors((prev) => ({
          ...prev,
          [v.id]: err?.message || 'Failed to load picture preview.',
        }));
      } finally {
        setLoadingImages((prev) => ({ ...prev, [v.id]: false }));
      }
    },
    [style]
  );

  useEffect(() => {
    // Populate initial images if available on variant objects
    const initialMap: Record<string, string> = {};
    variants.forEach((v) => {
      const img = v.image_url || v.image;
      if (img) {
        initialMap[v.id] = img;
      }
    });
    setVariantImages(initialMap);
    // Note: Auto-fetching loop removed to implement strict on-demand (lazy-loaded) picture generation.
  }, [variants]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4 md:p-6 animate-fade-in">
      {/* Header banner */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Choose Your Favorite Take</span>
            <span className="bg-indigo-100 text-indigo-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-2 capitalize">
              Style: {style}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Pick one to draw & paint
          </h2>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Idea: "{ideaPrompt || 'Scene'}"
          </p>
        </div>

        <button
          onClick={onBackToInput}
          className="px-4 py-2 bg-white/60 hover:bg-white text-slate-700 rounded-full text-xs font-bold border border-white/80 transition shadow-sm"
        >
          Change Idea
        </button>
      </div>

      {/* Grid of 4 Variants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {variants.map((varItem) => {
          const displayImage = variantImages[varItem.id] || varItem.image_url || varItem.image;
          const isFetching = loadingImages[varItem.id];
          const errorMsg = imageErrors[varItem.id];
          const isSquare = varItem.aspect === '1:1';

          return (
            <div
              key={varItem.id}
              className="glass-panel rounded-3xl p-5 flex flex-col justify-between gap-4 border border-white/70 shadow-md hover:shadow-xl hover:border-indigo-400/80 transition-all group relative overflow-hidden bg-white/90"
            >
              {/* Preview Container: Image if loaded, or SVG / Text-first layout */}
              <div
                className={`w-full ${
                  isSquare ? 'aspect-square' : 'aspect-[4/3]'
                } bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-hidden relative shadow-inner flex items-center justify-center`}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={varItem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : isFetching ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-indigo-600 text-xs font-bold p-6 text-center animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="font-extrabold text-sm text-indigo-900">
                      Generating artwork picture...
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Creating high-resolution visual preview
                    </span>
                  </div>
                ) : errorMsg ? (
                  <div className="flex flex-col items-center gap-2 text-rose-600 text-xs font-bold p-4 text-center">
                    <span>{errorMsg}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchSingleVariantImage(varItem);
                      }}
                      className="mt-1 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-full font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Picture Generation
                    </button>
                  </div>
                ) : (
                  /* Text-First composition thumbnail preview */
                  <div className="w-full h-full p-2 relative flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50/50">
                    {varItem.thumbnail_svg ? (
                      <div
                        className="w-full h-full flex items-center justify-center p-1"
                        dangerouslySetInnerHTML={{ __html: varItem.thumbnail_svg }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Sparkles className="w-8 h-8 text-indigo-400 opacity-60" />
                        <span className="text-xs font-bold text-slate-500">Composition Draft</span>
                      </div>
                    )}
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-600 border border-slate-200 shadow-sm">
                      {varItem.aspect || '4:3'}
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1.5 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition line-clamp-1">
                    {varItem.title}
                  </h3>
                  <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 shrink-0">
                    Take #{variants.indexOf(varItem) + 1}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 line-clamp-2 leading-relaxed">
                  {varItem.description || varItem.pitch}
                </p>
                {varItem.light && (
                  <p className="text-[11px] font-medium text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 line-clamp-1 mt-0.5">
                    💡 <span className="font-bold">Lighting:</span> {varItem.light}
                  </p>
                )}
              </div>

              {/* Primary Action Button: On-Demand Generate OR Select Scene */}
              {displayImage ? (
                <button
                  disabled={isLoading}
                  onClick={() => {
                    const updatedVar = {
                      ...varItem,
                      image: displayImage,
                      image_url: displayImage,
                    };
                    onSelectVariant(updatedVar);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 mt-1"
                >
                  <Palette className="w-4 h-4" />
                  🎨 Select this Scene
                </button>
              ) : (
                <button
                  disabled={isFetching || isLoading}
                  onClick={() => fetchSingleVariantImage(varItem)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 mt-1"
                >
                  <Sparkles className="w-4 h-4" />
                  ✨ Generate this Picture
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
