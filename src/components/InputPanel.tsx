import React, { useState, useRef } from 'react';
import { SCENE_PRESETS } from '../data/presets';
import { Medium, ScenePreset } from '../types';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Compass,
  Sun,
  Feather,
  Flame,
  Eye,
  Activity,
  User,
  Lightbulb,
} from 'lucide-react';

interface InputPanelProps {
  onGenerateVariants: (data: { idea: string; medium: Medium; referenceImageBase64?: string }) => void;
  onSelectPreset: (preset: ScenePreset) => void;
  isLoading: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4 text-amber-500" />,
  Feather: <Feather className="w-4 h-4 text-purple-500" />,
  Flame: <Flame className="w-4 h-4 text-orange-500" />,
  Compass: <Compass className="w-4 h-4 text-rose-500" />,
  Eye: <Eye className="w-4 h-4 text-sky-500" />,
  Sun: <Sun className="w-4 h-4 text-yellow-500" />,
  Activity: <Activity className="w-4 h-4 text-emerald-500" />,
  User: <User className="w-4 h-4 text-indigo-500" />,
};

export const InputPanel: React.FC<InputPanelProps> = ({
  onGenerateVariants,
  onSelectPreset,
  isLoading,
}) => {
  const [ideaText, setIdeaText] = useState('');
  const [medium, setMedium] = useState<Medium>('watercolour');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaText.trim() && !uploadedImage) {
      alert('Please enter an idea or select a scene starter');
      return;
    }

    onGenerateVariants({
      idea: ideaText.trim(),
      medium,
      referenceImageBase64: uploadedImage || undefined,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto glass-panel rounded-[32px] shadow-xl overflow-hidden p-6 md:p-8 border border-white/70 animate-fade-in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Character in Environment Studio</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Describe a Painting Scene
          </h2>
          <p className="text-xs md:text-sm font-semibold text-slate-600 mt-1">
            Enter a creature and environment idea. The engine generates 3-4 compositional variants to choose from.
          </p>
        </div>

        {/* Medium Selection Row */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Painting Medium:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['watercolour', 'soft pastel', 'pen and wash', 'mixed'] as Medium[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMedium(m)}
                className={`py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition border text-center ${
                  medium === m
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white/60 hover:bg-white text-slate-700 border-slate-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Scene Idea:
          </label>
          <div className="relative">
            <input
              type="text"
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="e.g. 'Dragon sleeping on coins' or 'Fox under giant mushroom after rain'..."
              className="w-full px-5 py-4 pl-12 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 text-sm md:text-base shadow-inner"
            />
            <Lightbulb className="w-5 h-5 text-amber-500 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Optional Reference Image Upload */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Optional Reference Photo:
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              Real animals, bark, water, or foliage reference
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!uploadedImage ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 flex items-center justify-center gap-3 cursor-pointer transition ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-300 hover:border-indigo-400 bg-white/40 hover:bg-white/70'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">
                Click or drop a reference photo here
              </span>
            </div>
          ) : (
            <div className="relative w-full h-32 bg-white/60 rounded-2xl overflow-hidden border border-slate-300 flex items-center justify-center shadow-inner">
              <img src={uploadedImage} alt="Reference" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => setUploadedImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Scene Seed Starters */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Or Choose a Scene Seed Starter:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {SCENE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setIdeaText(preset.prompt);
                  onSelectPreset(preset);
                }}
                className="p-3 rounded-2xl border border-slate-200/80 hover:border-indigo-400 bg-white/70 hover:bg-white text-left transition flex items-center gap-2.5 group shadow-sm active:scale-95"
              >
                <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-indigo-50 transition shrink-0">
                  {ICON_MAP[preset.iconName] || <Sparkles className="w-4 h-4 text-indigo-500" />}
                </div>
                <div className="truncate">
                  <h4 className="font-extrabold text-slate-900 text-xs truncate">
                    {preset.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    {preset.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Action Button */}
        <button
          type="submit"
          disabled={isLoading || (!ideaText.trim() && !uploadedImage)}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <span>Generating 3-4 Composition Variants...</span>
          ) : (
            <>
              <Compass className="w-5 h-5" />
              Explore Composition Variants
            </>
          )}
        </button>
      </form>
    </div>
  );
};
