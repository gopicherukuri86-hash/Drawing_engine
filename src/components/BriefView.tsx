import React, { useState } from 'react';
import { SceneBrief } from '../types';
import { DrawingStage } from './DrawingStage';
import {
  Palette,
  Eye,
  AlertTriangle,
  HelpCircle,
  Printer,
  Sparkles,
  Layers,
  BookOpen,
  Sun,
  ShieldAlert,
} from 'lucide-react';

interface BriefViewProps {
  brief: SceneBrief;
  onOpenStuckModal: () => void;
  onPrintReference: () => void;
  onNewScene: () => void;
  onSaveBrief: () => void;
  isSaved?: boolean;
}

export const BriefView: React.FC<BriefViewProps> = ({
  brief,
  onOpenStuckModal,
  onPrintReference,
  onNewScene,
  onSaveBrief,
  isSaved,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const { variant, medium, composition_guide, value_plan, palette, technique_notes, texture_notes, watch_points } = brief;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 p-4 md:p-6 animate-fade-in pb-20">
      {/* Top Brief Summary Banner */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/70 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-600 text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
              Artist Brief
            </span>
            <span className="bg-white/60 text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/80">
              Medium: {medium}
            </span>
            <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              {variant.difficulty}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {variant.title}
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-700 mt-1 max-w-2xl">
            {variant.pitch}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenStuckModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs uppercase tracking-wider rounded-full shadow-md flex items-center gap-2 transition active:scale-95 border border-amber-300"
          >
            <HelpCircle className="w-4 h-4 text-amber-950" />
            I'm Stuck
          </button>

          <button
            onClick={onPrintReference}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md flex items-center gap-2 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Reference Sheet
          </button>

          <button
            onClick={onSaveBrief}
            disabled={isSaved}
            className={`px-4 py-2.5 rounded-full font-extrabold text-xs uppercase tracking-wider transition ${
              isSaved
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-300 shadow-sm'
            }`}
          >
            {isSaved ? 'Saved to Gallery' : 'Save Brief'}
          </button>

          <button
            onClick={onNewScene}
            className="px-3.5 py-2.5 bg-white/50 hover:bg-white text-slate-700 rounded-full font-bold text-xs border border-white/70"
          >
            New Scene
          </button>
        </div>
      </div>

      {/* Main Section 1: Composition Guide (DrawingStage) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-900">1. Structural Composition Guide</h2>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            (Scaffolding for paper block-in)
          </span>
        </div>

        <DrawingStage
          steps={composition_guide}
          currentStepIndex={currentStepIndex}
          onStepChange={setCurrentStepIndex}
          title={variant.title}
          autoPlay={autoPlay}
          onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
          onAutoAdvance={() => {
            if (currentStepIndex < composition_guide.length - 1) {
              setCurrentStepIndex((prev) => prev + 1);
            } else {
              setAutoPlay(false);
            }
          }}
        />
      </section>

      {/* Main Section 2: Value Plan */}
      <section className="glass-panel p-6 rounded-3xl flex flex-col gap-4 border border-white/70 shadow-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-slate-700" />
          <h2 className="text-xl font-black text-slate-900">2. Value Structure & Light Plan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 3 Values */}
          <div className="bg-white/70 rounded-2xl p-4 border border-white/80 flex flex-col gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              3 Values (Mass & Depth)
            </span>
            <div className="w-full aspect-[280/200] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <svg
                viewBox="0 0 280 200"
                className="w-full h-full object-contain"
                dangerouslySetInnerHTML={{ __html: value_plan.thumbnails.three_values }}
              />
            </div>
          </div>

          {/* 5 Values */}
          <div className="bg-white/70 rounded-2xl p-4 border border-white/80 flex flex-col gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              5 Values (Form Hierarchy)
            </span>
            <div className="w-full aspect-[280/200] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <svg
                viewBox="0 0 280 200"
                className="w-full h-full object-contain"
                dangerouslySetInnerHTML={{ __html: value_plan.thumbnails.five_values }}
              />
            </div>
          </div>

          {/* Light Source Structure */}
          <div className="bg-white/70 rounded-2xl p-4 border border-white/80 flex flex-col gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              Light Direction & Focal Point
            </span>
            <div className="w-full aspect-[280/200] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <svg
                viewBox="0 0 280 200"
                className="w-full h-full object-contain"
                dangerouslySetInnerHTML={{ __html: value_plan.thumbnails.light_source_structure }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-100 px-5 py-3 rounded-2xl text-xs md:text-sm font-semibold flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p><strong>Focal Direction:</strong> {value_plan.eye_focus_note}</p>
        </div>
      </section>

      {/* Main Section 3: Palette */}
      <section className="glass-panel p-6 rounded-3xl flex flex-col gap-4 border border-white/70 shadow-lg">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-rose-600" />
          <h2 className="text-xl font-black text-slate-900">3. Color Palette ({medium})</h2>
        </div>

        <p className="text-xs font-semibold text-slate-600 italic">
          "{palette.rationale}"
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {palette.swatches.map((swatch, idx) => (
            <div
              key={`swatch-${idx}`}
              className="bg-white/80 rounded-2xl p-3 border border-white/90 shadow-sm flex flex-col items-center text-center gap-2"
            >
              <div
                className="w-12 h-12 rounded-xl shadow-inner border border-slate-300"
                style={{ backgroundColor: swatch.hex }}
              />
              <div className="flex flex-col gap-0.5 w-full">
                <span className="font-extrabold text-slate-900 text-xs truncate" title={swatch.pigment_name}>
                  {swatch.pigment_name}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{swatch.hex}</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 uppercase">
                  {swatch.depth_plane}
                </span>
                <p className="text-[10px] font-medium text-slate-600 mt-1 leading-tight">
                  {swatch.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Section 4 & 5: Technique & Texture Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technique Notes */}
        <section className="glass-panel p-6 rounded-3xl flex flex-col gap-3 border border-white/70 shadow-lg">
          <div className="flex items-center gap-2 text-indigo-900">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-lg font-black">4. Technique Notes ({medium})</h2>
          </div>
          <ul className="flex flex-col gap-2.5">
            {technique_notes.map((note, idx) => (
              <li key={`tech-${idx}`} className="text-xs font-medium text-slate-800 flex items-start gap-2.5 bg-white/60 p-3 rounded-xl border border-white/70">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Texture Notes */}
        <section className="glass-panel p-6 rounded-3xl flex flex-col gap-3 border border-white/70 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-900">
            <Layers className="w-5 h-5" />
            <h2 className="text-lg font-black">5. Material Texture Execution</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {texture_notes.map((tex, idx) => (
              <div key={`tex-${idx}`} className="bg-white/60 p-3 rounded-xl border border-white/70 flex flex-col gap-1">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                  {tex.material}
                </span>
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {tex.instruction}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Main Section 6: Watch Points */}
      <section className="glass-panel p-6 rounded-3xl flex flex-col gap-4 border border-rose-200/60 shadow-lg bg-rose-50/20">
        <div className="flex items-center gap-2 text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h2 className="text-xl font-black">6. Critical Watch Points (Avoid Irreversible Mistakes)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {watch_points.map((wp, idx) => (
            <div key={`wp-${idx}`} className="bg-white/90 rounded-2xl p-4 border border-rose-200 shadow-sm flex flex-col gap-2">
              <span className="text-[11px] font-black text-rose-700 uppercase tracking-wider bg-rose-100 px-2.5 py-0.5 rounded-full w-fit">
                Stage: {wp.stage}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Risk:
                </span>
                <p className="text-xs font-medium text-rose-950 leading-relaxed">
                  {wp.risk}
                </p>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                <span className="text-xs font-black text-emerald-800">
                  Prevention:
                </span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {wp.prevention}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Bottom Help Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={onOpenStuckModal}
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm rounded-full shadow-2xl flex items-center gap-2 border-2 border-white transition active:scale-95"
        >
          <HelpCircle className="w-5 h-5" />
          I'm Stuck on this Painting
        </button>
      </div>
    </div>
  );
};
