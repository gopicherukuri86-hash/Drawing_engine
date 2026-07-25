import React, { useState, useEffect, useCallback } from 'react';
import { SceneVariant, Style } from '../types';
import { Sparkles, Palette, Loader2, RefreshCw } from 'lucide-react';
import { checkCapAllowed, recordImageGeneration } from '../utils/costTracker';

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
      const img = v.image_url || v.image;
      if (img) return;

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
          setVariantImages((prev) => ({ ...prev, [v.id]: data.image }));
          v.image_url = data.image;
          recordImageGeneration(1);
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
    // Populate initial images if available
    const initialMap: Record<string, string> = {};
    variants.forEach((v) => {
      const img = v.image_url || v.image;
      if (img) {
        initialMap[v.id] = img;
      }
    });
    setVariantImages(initialMap);

    // Auto-fetch missing images for all variants in parallel
    variants.forEach((v) => {
      const img = v.image_url || v.image;
      if (!img) {
        fetchSingleVariantImage(v);
      }
    });
  }, [variants, fetchSingleVariantImage]);

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
              onClick={() => {
                if (!isLoading) {
                  const updatedVar = {
                    ...varItem,
                    image: displayImage || varItem.image,
                    image_url: displayImage || varItem.image_url,
                  };
                  onSelectVariant(updatedVar);
                }
              }}
              className="glass-panel rounded-3xl p-4 flex flex-col justify-between gap-3 border border-white/70 shadow-md hover:shadow-xl hover:border-indigo-400/80 transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Image Preview Container */}
              <div
                className={`w-full ${
                  isSquare ? 'aspect-square' : 'aspect-[4/3]'
                } bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-hidden relative shadow-inner flex items-center justify-center`}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={varItem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : isFetching ? (
                  <div className="flex flex-col items-center gap-2 text-indigo-600 text-xs font-bold p-4 text-center animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Generating artwork picture...</span>
                  </div>
                ) : errorMsg ? (
                  <div className="flex flex-col items-center gap-2 text-rose-600 text-xs font-bold p-4 text-center">
                    <span>{errorMsg}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchSingleVariantImage(varItem);
                      }}
                      className="mt-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-full font-extrabold text-xs flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Picture
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchSingleVariantImage(varItem);
                    }}
                    className="px-3.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-full font-extrabold text-xs flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Generate Picture
                  </button>
                )}
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition">
                    {varItem.title}
                  </h3>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {varItem.aspect || '4:3'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 line-clamp-2">
                  {varItem.description || varItem.pitch}
                </p>
              </div>

              {/* Selection Button */}
              <button
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-95 mt-1"
              >
                <Sparkles className="w-4 h-4" />
                Select This Take
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
