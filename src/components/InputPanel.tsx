import React, { useState, useRef } from 'react';
import { PRESETS } from '../data/presets';
import { DrawingPreset } from '../types';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Footprints,
  Ship,
  Bot,
  Rocket,
  Car,
  Wand2,
  Feather,
  Wand,
  Palette,
  Lightbulb,
} from 'lucide-react';

interface InputPanelProps {
  onGenerate: (data: { prompt?: string; imageBase64?: string; mimeType?: string; complexity: 'easy' | 'standard' | 'detailed' }) => void;
  onSelectPreset: (preset: DrawingPreset) => void;
  isLoading: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Footprints: <Footprints className="w-4 h-4 text-emerald-500" />,
  Ship: <Ship className="w-4 h-4 text-sky-500" />,
  Bot: <Bot className="w-4 h-4 text-purple-500" />,
  Sparkles: <Sparkles className="w-4 h-4 text-amber-500" />,
  Rocket: <Rocket className="w-4 h-4 text-rose-500" />,
  Car: <Car className="w-4 h-4 text-blue-500" />,
  Wand2: <Wand2 className="w-4 h-4 text-pink-500" />,
  Feather: <Feather className="w-4 h-4 text-indigo-500" />,
};

const SUGGESTIONS = [
  'A flying pirate ship',
  'A cute baby dinosaur',
  'A friendly space alien',
  'A smiling race car',
  'A magic castle',
  'A playful dolphin',
  'A cute cat wearing a crown',
];

export const InputPanel: React.FC<InputPanelProps> = ({
  onGenerate,
  onSelectPreset,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'preset'>('text');
  const [promptText, setPromptText] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/png');
  const [complexity, setComplexity] = useState<'easy' | 'standard' | 'detailed'>('standard');
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
      alert('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    setUploadedMimeType(file.type);
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
    if (activeTab === 'image' && !uploadedImage) {
      alert('Please upload an image first, or enter a text idea!');
      return;
    }
    if (activeTab === 'text' && !promptText.trim()) {
      alert('Please enter a drawing idea or select a preset!');
      return;
    }

    onGenerate({
      prompt: activeTab === 'text' ? promptText.trim() : undefined,
      imageBase64: activeTab === 'image' ? (uploadedImage || undefined) : undefined,
      mimeType: uploadedMimeType,
      complexity,
    });
  };

  return (
    <div className="w-full glass-panel rounded-[32px] shadow-xl overflow-hidden">
      {/* Tab Switcher Header */}
      <div className="bg-white/30 backdrop-blur-md p-3 border-b border-white/50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-2.5 px-3 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'text'
              ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-200/50 border border-white/60'
              : 'bg-white/40 text-slate-700 hover:bg-white/70 border border-white/40'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Text Idea
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`flex-1 py-2.5 px-3 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'image'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-200/50 border border-white/60'
              : 'bg-white/40 text-slate-700 hover:bg-white/70 border border-white/40'
          }`}
        >
          <Upload className="w-4 h-4" />
          Photo / Scribble
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preset')}
          className={`flex-1 py-2.5 px-3 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'preset'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50 border border-white/60'
              : 'bg-white/40 text-slate-700 hover:bg-white/70 border border-white/40'
          }`}
        >
          <Palette className="w-4 h-4" />
          1-Tap Presets
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        {/* TAB 1: Text Prompt Input */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
              What do you want to draw today?
            </label>
            <div className="relative">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. 'A flying pirate ship' or 'A baby dinosaur'..."
                className="w-full px-5 py-4 pl-12 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white font-medium text-slate-800 text-sm md:text-base shadow-inner transition"
              />
              <Wand className="w-5 h-5 text-amber-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Idea Chips */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-600">Quick inspiration ideas:</span>
              <div className="flex items-center flex-wrap gap-1.5">
                {SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setPromptText(sug)}
                    className="px-3 py-1 bg-white/50 hover:bg-white/80 text-amber-950 border border-white/60 rounded-full text-xs font-semibold shadow-sm transition active:scale-95"
                  >
                    ✨ {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Image Upload */}
        {activeTab === 'image' && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Upload a Toy, Photo, or Rough Scribble to Deconstruct
            </label>

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
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-sky-500 bg-sky-100/50'
                    : 'border-white/80 hover:border-sky-400 bg-white/30 hover:bg-white/50 backdrop-blur-md'
                }`}
              >
                <div className="p-3.5 bg-sky-500/20 text-sky-700 rounded-2xl mb-2">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <p className="font-extrabold text-slate-800 text-sm">
                  Click or Drop a Photo Here
                </p>
                <p className="text-xs font-medium text-slate-600 mt-1 max-w-xs">
                  Upload a photo of a stuffed toy, household object, or kid scribble to decompose it into basic shapes!
                </p>
              </div>
            ) : (
              <div className="relative w-full aspect-video max-h-52 bg-white/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/60 flex items-center justify-center group shadow-md">
                <img
                  src={uploadedImage}
                  alt="Uploaded target"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-3 right-3 p-2 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-700 transition"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Presets */}
        {activeTab === 'preset' && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Choose a Ready-Made Tutorial
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className="p-3.5 rounded-2xl border border-white/60 hover:border-indigo-400 bg-white/40 hover:bg-white/70 backdrop-blur-md text-left transition flex items-start gap-3 group shadow-sm active:scale-95"
                >
                  <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 group-hover:scale-105 transition">
                    {ICON_MAP[preset.iconName] || <Sparkles className="w-4 h-4 text-indigo-500" />}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-700">
                      {preset.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-600 line-clamp-1 mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step Complexity & Main Action Row */}
        {activeTab !== 'preset' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/40">
            {/* Complexity selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-extrabold text-slate-700 whitespace-nowrap">Steps:</span>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as any)}
                className="px-4 py-2 bg-white/50 backdrop-blur-md border border-white/60 rounded-full font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="easy">Easy (2-3 Basic Steps)</option>
                <option value="standard">Standard (4-6 Shapes)</option>
                <option value="detailed">Detailed (6-8 Shapes)</option>
              </select>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-xl transition active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Deconstructing Idea...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Deconstruct into Drawing Steps 🎨
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
