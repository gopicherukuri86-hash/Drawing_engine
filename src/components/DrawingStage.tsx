import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DrawingStep } from '../types';
import { Play, Pause, SkipBack, SkipForward, RefreshCw, Volume2, VolumeX, Eye, Sparkles } from 'lucide-react';
import { speakInstruction, stopSpeech, isSpeechSupported } from '../utils/speech';
import { sanitizeSvg } from '../utils/sanitizeSvg';

interface DrawingStageProps {
  steps: DrawingStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  title?: string;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onAutoAdvance?: () => void;
}

const withPathLength = (svg: string) => {
  const sanitized = sanitizeSvg(svg);
  return sanitized.replace(
    /<(path|circle|ellipse|line|polyline|polygon|rect)(?![^>]*\bpathLength=)\b/g,
    '<$1 pathLength="1"'
  );
};

export const DrawingStage: React.FC<DrawingStageProps> = ({
  steps,
  currentStepIndex,
  onStepChange,
  title,
  autoPlay,
  onToggleAutoPlay,
  voiceEnabled = true,
  onToggleVoice,
  onAutoAdvance,
}) => {
  const [highlightNewStroke, setHighlightNewStroke] = useState(true);
  const [showGuideLines, setShowGuideLines] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const autoPlayRef = useRef(autoPlay);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  const currentStep = steps[currentStepIndex];

  // Trigger speech when step changes if voice is enabled
  useEffect(() => {
    if (currentStep && voiceEnabled) {
      setIsSpeaking(true);
      speakInstruction(currentStep.instruction, () => {
        setIsSpeaking(false);
        if (autoPlayRef.current && onAutoAdvance) {
          onAutoAdvance();
        }
      });
    } else {
      stopSpeech();
      setIsSpeaking(false);
    }
  }, [currentStepIndex, currentStep, voiceEnabled]);

  // Clean speech when unmounted
  useEffect(() => {
    return () => stopSpeech();
  }, []);

  // Force re-triggering path animations when replaying
  const handleReplayAnimation = () => {
    setAnimationKey((prev) => prev + 1);
    if (currentStep && voiceEnabled) {
      setIsSpeaking(true);
      speakInstruction(currentStep.instruction, () => {
        setIsSpeaking(false);
        if (autoPlayRef.current && onAutoAdvance) {
          onAutoAdvance();
        }
      });
    }
  };

  // Prepare combined SVG elements up to currentStepIndex
  const renderedSvgContent = useMemo(() => {
    if (!steps || steps.length === 0) return null;

    return (
      <>
        <style>{`
          @keyframes strokeDraw {
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes fillIn {
            from {
              fill-opacity: 0;
            }
            to {
              fill-opacity: 1;
            }
          }

          .anim-new-stroke > * {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            animation: strokeDraw 1.2s ease-out forwards,
                       fillIn 0.4s 1.0s ease-out backwards;
          }

          .highlight-stroke > * {
            filter: drop-shadow(0 0 6px #2563eb);
          }

          .previous-stroke {
            opacity: 0.95;
          }
        `}</style>

        {/* Optional 500x500 Grid guide for kids */}
        {showGuideLines && (
          <g opacity="0.15" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4">
            <line x1="250" y1="0" x2="250" y2="500" />
            <line x1="0" y1="250" x2="500" y2="250" />
            <circle cx="250" cy="250" r="150" fill="none" />
            <rect x="50" y="50" width="400" height="400" fill="none" />
          </g>
        )}

        {/* Steps prior to current step */}
        {steps.slice(0, currentStepIndex).map((step, idx) => (
          <g
            key={`prev-step-${step.step_number}-${idx}`}
            className="previous-stroke"
            dangerouslySetInnerHTML={{ __html: withPathLength(step.svg_code) }}
          />
        ))}

        {/* Current active step */}
        {currentStep && (
          <g
            key={`active-step-${currentStep.step_number}-${animationKey}`}
            className={`anim-new-stroke ${highlightNewStroke ? 'highlight-stroke' : ''}`}
            dangerouslySetInnerHTML={{ __html: withPathLength(currentStep.svg_code) }}
          />
        )}
      </>
    );
  }, [steps, currentStepIndex, currentStep, highlightNewStroke, showGuideLines, animationKey]);

  return (
    <div className="flex flex-col items-center w-full glass-panel rounded-[32px] shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="w-full bg-white/30 backdrop-blur-md px-6 py-4 border-b border-white/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-yellow-400 text-yellow-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-white/50 shadow-sm">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <h2 className="font-extrabold text-slate-800 text-base md:text-lg truncate max-w-xs md:max-w-md">
            {title || 'Step-by-Step Drawing Guide'}
          </h2>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuideLines(!showGuideLines)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
              showGuideLines ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/40 border border-white/50 text-slate-700 hover:bg-white/70'
            }`}
            title="Toggle Drawing Alignment Grid"
          >
            <Eye className="w-3.5 h-3.5" />
            Grid
          </button>

          <button
            onClick={() => setHighlightNewStroke(!highlightNewStroke)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
              highlightNewStroke ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/40 border border-white/50 text-slate-700 hover:bg-white/70'
            }`}
            title="Highlight new stroke in bold blue"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Highlight New Shape
          </button>

          {isSpeechSupported() && (
            <button
              onClick={() => {
                if (onToggleVoice) {
                  onToggleVoice();
                }
              }}
              className={`p-2 rounded-full transition ${
                voiceEnabled ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/40 text-slate-400 border border-white/50'
              }`}
              title={voiceEnabled ? 'Teacher Voice Active' : 'Voice Muted'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main 500x500 SVG Stage Container */}
      <div className="relative w-full aspect-square max-w-[500px] flex items-center justify-center p-6">
        {/* Canvas background card */}
        <div className="w-full h-full bg-white/70 backdrop-blur-md rounded-2xl shadow-inner border border-white/80 relative overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 500 500"
            className="w-full h-full object-contain drop-shadow-sm select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {renderedSvgContent}
          </svg>

          {/* Floating Replay Stroke Button */}
          <button
            onClick={handleReplayAnimation}
            className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-full shadow-md border border-white/80 transition active:scale-95"
            title="Replay stroke drawing animation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Instruction Box */}
      <div className="w-full bg-yellow-100/50 backdrop-blur-md px-6 py-4 border-t border-yellow-200/60 flex items-start gap-3.5">
        <div className={`p-2.5 rounded-full ${isSpeaking ? 'bg-amber-400 text-amber-950 animate-bounce' : 'bg-white/60 text-amber-950 border border-white/50'}`}>
          <Volume2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-black text-amber-950 uppercase tracking-wider block mb-0.5">
            Art Teacher Instructions
          </span>
          <p className="text-slate-800 font-bold text-sm md:text-base leading-relaxed">
            {currentStep?.instruction || 'Loading step instructions...'}
          </p>
        </div>
      </div>

      {/* Playback Controls Footer */}
      <div className="w-full bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
          disabled={currentStepIndex === 0}
          className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-sm font-bold flex items-center gap-1.5 transition active:scale-95 border border-slate-700"
        >
          <SkipBack className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleAutoPlay}
            className={`px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 transition active:scale-95 shadow-md ${
              autoPlay
                ? 'bg-yellow-400 hover:bg-yellow-300 text-yellow-950'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {autoPlay ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pause Auto
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Play Step-by-Step
              </>
            )}
          </button>

          {/* Quick step jump pills */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-full border border-slate-700">
            {steps.map((_, idx) => (
              <button
                key={`pill-${idx}`}
                onClick={() => onStepChange(idx)}
                className={`w-7 h-7 rounded-full text-xs font-black transition ${
                  idx === currentStepIndex
                    ? 'bg-indigo-500 text-white shadow'
                    : idx < currentStepIndex
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStepChange(Math.min(steps.length - 1, currentStepIndex + 1))}
          disabled={currentStepIndex === steps.length - 1}
          className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-sm font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md"
        >
          Next
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
