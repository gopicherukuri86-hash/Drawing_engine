import React, { useState, useEffect } from 'react';
import { SceneVariant, Style } from '../types';
import { Sparkles, Palette, Loader2 } from 'lucide-react';
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

    // Auto-fetch missing images for variants if cap is allowed
    variants.forEach((v) => {
      const img = v.image_url || v.image;
      if (!img && !loadingImages[v.id]) {
        const { allowed } = checkCapAllowed();
        if (!allowed) {
          console.warn(`Daily $0.50 cap reached. Unlock cap in the top bar to generate more pictures.`);
          return;
        }

        setLoadingImages((prev) => ({ ...prev, [v.id]: true }));
        fetch('/api/generate-variant-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: v.imagePrompt || `${v.title}. ${v.description}`,
            title: v.title,
            style,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.image) {
              setVariantImages((prev) => ({ ...prev, [v.id]: data.image }));
              v.image_url = data.image;
              recordImageGeneration(1);
            }
          })
          .catch((err) => console.warn(`Failed auto-fetching image for variant ${v.title}`, err))
          .finally(() => {
            setLoadingImages((prev) => ({ ...prev, [v.id]: false }));
          });
      }
    });
  }, [variants, style]);

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

          return (
            <div
              key={varItem.id}
              onClick={() => {
                if (!isLoading) {
                  const updatedVar = { ...varItem, image: displayImage || varItem.image, image_url: displayImage || varItem.image_url };
                  onSelectVariant(updatedVar);
                }
              }}
              className="glass-panel rounded-3xl p-4 flex flex-col justify-between gap-3 border border-white/70 shadow-md hover:shadow-xl hover:border-indigo-400/80 transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Image Preview */}
              <div className="w-full aspect-[4/3] bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-hidden relative shadow-inner flex items-center justify-center">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={varItem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-indigo-600 text-xs font-bold p-4 text-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>{isFetching ? 'Generating artwork picture...' : 'Preparing preview...'}</span>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1 px-1">
                <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition">
                  {varItem.title}
                </h3>
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
