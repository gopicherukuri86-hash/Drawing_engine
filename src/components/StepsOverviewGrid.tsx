import React from 'react';
import { DrawingStep } from '../types';
import { Printer, ExternalLink, Sparkles } from 'lucide-react';
import { sanitizeSvg } from '../utils/sanitizeSvg';

interface StepsOverviewGridProps {
  steps: DrawingStep[];
  title?: string;
  onSelectStep: (stepIndex: number) => void;
}

export const StepsOverviewGrid: React.FC<StepsOverviewGridProps> = ({
  steps,
  title,
  onSelectStep,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full glass-panel rounded-[32px] shadow-xl overflow-hidden print:shadow-none print:border-none print:m-0">
      {/* Top Header */}
      <div className="bg-white/30 backdrop-blur-md px-6 py-4 border-b border-white/50 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold text-slate-800 text-base md:text-lg">
            Printable Step-by-Step Overview Sheet
          </h3>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-200 transition active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Print Drawing Sheet
        </button>
      </div>

      {/* Printable Sheet Title (Visible on Print) */}
      <div className="hidden print:block p-6 text-center border-b border-slate-300">
        <h1 className="text-2xl font-black text-slate-900">
          {title || 'KidArt Step-by-Step Drawing Tutorial'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Reconstructive Drawing Engine • Step-by-Step Geometric Shapes Guide
        </p>
      </div>

      {/* Steps Cards Grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((step, index) => {
          // Accumulate SVGs up to current step
          const accumulatedSvgCodes = sanitizeSvg(
            steps
              .slice(0, index + 1)
              .map((s) => s.svg_code)
              .join('\n')
          );

          return (
            <div
              key={`grid-step-${step.step_number}`}
              onClick={() => onSelectStep(index)}
              className="bg-white/40 hover:bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 hover:border-amber-400 p-4 transition cursor-pointer flex flex-col justify-between gap-3 group relative shadow-sm active:scale-95 print:border-slate-400 print:bg-white"
            >
              {/* Step number badge */}
              <div className="flex items-center justify-between">
                <span className="bg-yellow-400 text-yellow-950 text-xs font-black px-3 py-1 rounded-full border border-white/50 uppercase tracking-wider shadow-sm">
                  Step {step.step_number}
                </span>
                <span className="text-[11px] font-bold text-slate-500 group-hover:text-indigo-700 flex items-center gap-1 print:hidden">
                  Jump to step <ExternalLink className="w-3 h-3" />
                </span>
              </div>

              {/* Step SVG Preview */}
              <div className="w-full aspect-square bg-white/80 backdrop-blur-sm rounded-xl border border-white/80 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                <svg
                  viewBox="0 0 500 500"
                  className="w-full h-full object-contain"
                  xmlns="http://www.w3.org/2000/svg"
                  dangerouslySetInnerHTML={{ __html: accumulatedSvgCodes }}
                />
              </div>

              {/* Step Instruction text */}
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug line-clamp-3">
                {step.instruction}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
