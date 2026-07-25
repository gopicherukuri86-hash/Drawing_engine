import React, { useState } from 'react';
import { SceneBrief, Medium, StuckExchange } from '../types';
import { X, Upload, Camera, HelpCircle, CheckCircle, AlertOctagon, ArrowRight, Sparkles } from 'lucide-react';

interface StuckModalProps {
  brief: SceneBrief;
  medium: Medium;
  onClose: () => void;
  onSubmitStuck: (data: { problem: string; wipImageBase64?: string }) => Promise<StuckExchange | null>;
}

const WATERCOLOUR_QUICK_PICKS = [
  "colours went muddy",
  "lost my white areas",
  "a bloom/backrun appeared",
  "it dried too fast",
  "too dark, can't lift it",
  "paper buckled",
];

const PASTEL_QUICK_PICKS = [
  "it's gone grey and overworked",
  "paper won't take any more",
  "smudged an area I'd finished",
  "colours won't blend",
];

const COMMON_QUICK_PICKS = [
  "the proportions look wrong",
  "it looks flat",
  "I don't know what to do next",
  "I don't like how it's turning out",
];

export const StuckModal: React.FC<StuckModalProps> = ({
  brief,
  medium,
  onClose,
  onSubmitStuck,
}) => {
  const [problemText, setProblemText] = useState('');
  const [wipImageBase64, setWipImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<StuckExchange | null>(null);

  const quickPicks = [
    ...(medium === 'watercolour' || medium === 'either' ? WATERCOLOUR_QUICK_PICKS : []),
    ...(medium === 'soft pastel' || medium === 'either' ? PASTEL_QUICK_PICKS : []),
    ...COMMON_QUICK_PICKS,
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWipImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!problemText.trim()) return;
    setIsSubmitting(true);
    const res = await onSubmitStuck({
      problem: problemText,
      wipImageBase64: wipImageBase64 || undefined,
    });
    setIsSubmitting(false);
    if (res) {
      setDiagnosisResult(res);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="glass-panel w-full max-w-2xl bg-white/90 rounded-3xl p-6 md:p-8 border border-white shadow-2xl relative flex flex-col gap-6 my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500 text-amber-950 rounded-2xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Technical Problem Diagnosis
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              Painting: "{brief.variant.title}" ({medium})
            </p>
          </div>
        </div>

        {!diagnosisResult ? (
          /* Form View */
          <div className="flex flex-col gap-5">
            {/* Quick-Pick Chips */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Common Quick-Pick Issues:
              </span>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((pick, idx) => (
                  <button
                    key={`pick-${idx}`}
                    type="button"
                    onClick={() => setProblemText(pick)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                      problemText === pick
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white/80 hover:bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {pick}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Text Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Describe What Went Wrong:
              </label>
              <textarea
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="e.g. 'The background wash bled into the creature\'s face before it dried' or 'The paper tooth is clogged'..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 text-sm shadow-inner"
              />
            </div>

            {/* Optional WIP Photo Upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Optional Work-in-Progress Photo:</span>
                <span className="text-[10px] text-slate-500 font-normal">Allows direct photo diagnosis</span>
              </label>

              {wipImageBase64 ? (
                <div className="relative w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-300 flex items-center justify-center">
                  <img src={wipImageBase64} alt="WIP" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setWipImageBase64(null)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-white transition">
                  <Camera className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    Upload Photo of your Painting
                  </span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Submit Action */}
            <button
              onClick={handleSubmit}
              disabled={!problemText.trim() || isSubmitting}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-amber-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Diagnosing Issue...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Diagnose & Get Recovery Steps
                </>
              )}
            </button>
          </div>
        ) : (
          /* Diagnosis Result View */
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Status Header */}
            <div className="flex items-center justify-between bg-slate-100 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Recoverable Status:
              </span>
              <span
                className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                  diagnosisResult.recoverable === 'yes'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : diagnosisResult.recoverable === 'partly'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {diagnosisResult.recoverable === 'yes'
                  ? 'Fully Recoverable'
                  : diagnosisResult.recoverable === 'partly'
                  ? 'Partially Recoverable'
                  : 'Unrecoverable (Salvage Route)'}
              </span>
            </div>

            {/* Diagnosis */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-1">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Diagnosis:
              </span>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {diagnosisResult.diagnosis}
              </p>
            </div>

            {/* Recovery Steps */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                Ordered Recovery Action Steps:
              </span>
              <ul className="flex flex-col gap-2">
                {diagnosisResult.recovery.map((step, idx) => (
                  <li
                    key={`rec-${idx}`}
                    className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-xs font-semibold text-slate-800 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Time & Keep Going */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex flex-col gap-1">
                <span className="text-[11px] font-black text-amber-900 uppercase">
                  Lesson for Next Time:
                </span>
                <p className="text-xs font-medium text-amber-950">
                  {diagnosisResult.next_time}
                </p>
              </div>

              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[11px] font-black text-amber-400 uppercase">
                  Instructor Note:
                </span>
                <p className="text-xs font-medium leading-relaxed">
                  {diagnosisResult.keep_going}
                </p>
              </div>
            </div>

            {/* Done button */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition"
            >
              Return to Brief & Painting
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
