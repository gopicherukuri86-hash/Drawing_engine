import React from 'react';
import { DrawingStep, SceneBrief } from '../types';
import { Printer, Sparkles, Layers, Eye, Palette, BookOpen, ShieldAlert } from 'lucide-react';
import { sanitizeSvg } from '../utils/sanitizeSvg';

interface StepsOverviewGridProps {
  steps?: DrawingStep[];
  title?: string;
  brief?: SceneBrief;
  onSelectStep?: (stepIndex: number) => void;
}

export const StepsOverviewGrid: React.FC<StepsOverviewGridProps> = ({
  steps = [],
  title,
  brief,
  onSelectStep,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const compositionSteps = brief?.composition_guide || steps;
  const displayTitle = brief?.variant?.title || title || 'Step-by-Step Drawing Guide';

  return (
    <div className="w-full glass-panel rounded-[32px] shadow-xl overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 bg-white/90">
      {/* Top Action Header (Hidden in Print) */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-base md:text-lg">
            Printable Artist Reference Sheet
          </h3>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition active:scale-95 border border-amber-300"
        >
          <Printer className="w-4 h-4" />
          Print Reference Sheet
        </button>
      </div>

      {/* Complete Printable Reference Sheet Container */}
      <div className="p-6 md:p-8 flex flex-col gap-8 print:p-4 print:gap-6">
        {/* Printable Title Block */}
        <div className="border-b border-slate-300 pb-4 text-center flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700 tracking-wider mb-1">
            <span>Reconstructive Scene Studio</span>
            {brief && <span>• Medium: {brief.medium}</span>}
          </div>
          <h1 className="text-3xl font-black text-slate-900">{displayTitle}</h1>
          {brief?.variant?.pitch && (
            <p className="text-xs font-semibold text-slate-600 max-w-2xl mt-1">
              {brief.variant.pitch}
            </p>
          )}
        </div>

        {/* Section A: Composition Guide Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              1. Composition & Structure Steps
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {compositionSteps.map((step, index) => {
              const accumulatedSvg = sanitizeSvg(
                compositionSteps
                  .slice(0, index + 1)
                  .map((s) => s.svg_code)
                  .join('\n')
              );

              return (
                <div
                  key={`ref-step-${step.step_number}`}
                  onClick={() => onSelectStep?.(index)}
                  className="border border-slate-300 rounded-2xl p-3 bg-white shadow-sm flex flex-col justify-between gap-2 cursor-pointer hover:border-indigo-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                      Step {step.step_number}
                    </span>
                    {step.layer && (
                      <span className="text-[9px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {step.layer}
                      </span>
                    )}
                  </div>

                  <div className="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-200 p-1">
                    <svg
                      viewBox="0 0 500 500"
                      className="w-full h-full object-contain"
                      dangerouslySetInnerHTML={{ __html: accumulatedSvg }}
                    />
                  </div>

                  <p className="text-[11px] font-medium text-slate-800 leading-tight line-clamp-3">
                    {step.instruction}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section B: Value Plan (if Brief present) */}
        {brief?.value_plan && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
              <Eye className="w-4 h-4 text-slate-800" />
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                2. Value Structure & Light Plan
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="border border-slate-300 rounded-2xl p-2.5 bg-white flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-700 uppercase">3 Values</span>
                <div className="w-full aspect-[280/200] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <svg viewBox="0 0 280 200" className="w-full h-full object-contain" dangerouslySetInnerHTML={{ __html: brief.value_plan.thumbnails.three_values }} />
                </div>
              </div>

              <div className="border border-slate-300 rounded-2xl p-2.5 bg-white flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-700 uppercase">5 Values</span>
                <div className="w-full aspect-[280/200] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <svg viewBox="0 0 280 200" className="w-full h-full object-contain" dangerouslySetInnerHTML={{ __html: brief.value_plan.thumbnails.five_values }} />
                </div>
              </div>

              <div className="border border-slate-300 rounded-2xl p-2.5 bg-white flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-700 uppercase">Light & Focal Point</span>
                <div className="w-full aspect-[280/200] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <svg viewBox="0 0 280 200" className="w-full h-full object-contain" dangerouslySetInnerHTML={{ __html: brief.value_plan.thumbnails.light_source_structure }} />
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 italic">
              Eye Focus: {brief.value_plan.eye_focus_note}
            </p>
          </div>
        )}

        {/* Section C: Palette Swatches */}
        {brief?.palette && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
              <Palette className="w-4 h-4 text-rose-600" />
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                3. Color Swatches ({brief.medium})
              </h2>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {brief.palette.swatches.map((sw, i) => (
                <div key={`p-ref-${i}`} className="border border-slate-300 rounded-xl p-2 bg-white flex flex-col items-center text-center gap-1">
                  <div className="w-8 h-8 rounded-lg border border-slate-300" style={{ backgroundColor: sw.hex }} />
                  <span className="text-[10px] font-bold text-slate-900 truncate w-full" title={sw.pigment_name}>{sw.pigment_name}</span>
                  <span className="text-[8px] font-bold text-indigo-700 uppercase">{sw.depth_plane}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section D: Technique & Watch Points */}
        {brief && (
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-300 rounded-2xl p-3 bg-white flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-indigo-900 border-b border-slate-200 pb-1">
                <BookOpen className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase">Technique Notes</h3>
              </div>
              <ul className="flex flex-col gap-1.5 text-[11px] font-medium text-slate-800">
                {brief.technique_notes.map((tn, idx) => (
                  <li key={`ref-tn-${idx}`} className="leading-snug">• {tn}</li>
                ))}
              </ul>
            </div>

            <div className="border border-rose-200 rounded-2xl p-3 bg-rose-50/30 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-rose-900 border-b border-rose-200 pb-1">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-black uppercase">Watch Points</h3>
              </div>
              <ul className="flex flex-col gap-2 text-[11px]">
                {brief.watch_points.map((wp, idx) => (
                  <li key={`ref-wp-${idx}`} className="leading-snug">
                    <strong className="text-rose-900">[{wp.stage}] Risk:</strong> {wp.risk} <br />
                    <strong className="text-emerald-800">Prevent:</strong> {wp.prevention}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
