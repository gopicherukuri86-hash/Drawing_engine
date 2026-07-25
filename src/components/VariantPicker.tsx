import React from 'react';
import { SceneVariant, Medium } from '../types';
import { Sparkles, Layers, Sun, Compass, Shield } from 'lucide-react';

interface VariantPickerProps {
  variants: SceneVariant[];
  ideaPrompt: string;
  medium: Medium;
  onSelectVariant: (variant: SceneVariant) => void;
  onBackToInput: () => void;
  isLoading?: boolean;
}

export const VariantPicker: React.FC<VariantPickerProps> = ({
  variants,
  ideaPrompt,
  medium,
  onSelectVariant,
  onBackToInput,
  isLoading,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-4 md:p-6 animate-fade-in">
      {/* Header banner */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Step 1: Composition Variants</span>
            <span className="bg-indigo-100 text-indigo-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-2">
              Medium: {medium}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Choose a Composition Direction
          </h2>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Idea: "{ideaPrompt || 'Character scene'}" • Select the mood and framing that fits your vision.
          </p>
        </div>

        <button
          onClick={onBackToInput}
          className="px-4 py-2 bg-white/60 hover:bg-white text-slate-700 rounded-full text-xs font-bold border border-white/80 transition shadow-sm"
        >
          Change Idea
        </button>
      </div>

      {/* Grid of Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {variants.map((varItem) => {
          const difficultyColor =
            varItem.difficulty === 'approachable'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : varItem.difficulty === 'a stretch'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-rose-100 text-rose-800 border-rose-200';

          return (
            <div
              key={varItem.id}
              onClick={() => !isLoading && onSelectVariant(varItem)}
              className="glass-panel rounded-3xl p-5 flex flex-col justify-between gap-4 border border-white/70 shadow-md hover:shadow-xl hover:border-indigo-400/80 transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Thumbnail SVG Card */}
              <div className="w-full aspect-[280/200] bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-hidden relative shadow-inner flex items-center justify-center">
                <svg
                  viewBox="0 0 280 200"
                  className="w-full h-full object-contain select-none"
                  xmlns="http://www.w3.org/2000/svg"
                  dangerouslySetInnerHTML={{ __html: varItem.thumbnail_svg }}
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-sm ${difficultyColor}`}>
                    {varItem.difficulty}
                  </span>
                </div>
              </div>

              {/* Information Body */}
              <div className="flex flex-col gap-2.5">
                <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition">
                  {varItem.title}
                </h3>
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {varItem.pitch}
                </p>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span><strong>Framing:</strong> {varItem.framing}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span><strong>Lighting:</strong> {varItem.light}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Mood:</strong> {varItem.mood}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-95"
              >
                <Shield className="w-4 h-4" />
                Select & Generate Brief
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
