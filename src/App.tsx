import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { VariantPicker } from './components/VariantPicker';
import { BriefView } from './components/BriefView';
import { StuckModal } from './components/StuckModal';
import { StepsOverviewGrid } from './components/StepsOverviewGrid';
import { SavedGalleryModal } from './components/SavedGalleryModal';
import { SceneVariant, SceneBrief, Style, ScenePreset, StuckExchange } from './types';
import { getSavedBriefs, saveBriefToStorage, deleteBriefFromStorage } from './lib/storage';
import { checkCapAllowed, recordImageGeneration } from './utils/costTracker';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [viewState, setViewState] = useState<'input' | 'variants' | 'brief' | 'reference'>('input');
  const [currentIdea, setCurrentIdea] = useState<string>('');
  const [currentStyle, setCurrentStyle] = useState<Style>('watercolour');
  const [variants, setVariants] = useState<SceneVariant[] | null>(null);
  const [currentBrief, setCurrentBrief] = useState<SceneBrief | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [isStuckModalOpen, setIsStuckModalOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [savedBriefs, setSavedBriefs] = useState<SceneBrief[]>([]);

  // Load saved briefs from IndexedDB on mount
  useEffect(() => {
    async function loadStored() {
      try {
        const stored = await getSavedBriefs();
        setSavedBriefs(stored);
      } catch (err) {
        console.error('Error loading saved briefs from IndexedDB:', err);
      }
    }
    loadStored();
  }, []);

  // Call 1: Generate Composition Variants
  const handleGenerateVariants = async (data: {
    idea: string;
    style: Style;
    referenceImageBase64?: string;
  }) => {
    const { allowed } = checkCapAllowed();
    if (!allowed) {
      setErrorMessage('Daily hard cap ($0.50) reached. Click the budget tracker badge at the top right of the screen to unlock/release the limit for today.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentIdea(data.idea);
    setCurrentStyle(data.style);

    try {
      const res = await fetch('/api/scene-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate art takes.');
      }

      setVariants(json.variants);
      setViewState('variants');

      // Record image count for variants with generated images
      const imagesCount = json.variants?.filter((v: any) => v.image_url || v.image)?.length || 0;
      if (imagesCount > 0) {
        recordImageGeneration(imagesCount);
      }
    } catch (err: any) {
      console.error('Variant generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate art takes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Preset Seed Selection
  const handleSelectPreset = (preset: ScenePreset) => {
    handleGenerateVariants({
      idea: preset.prompt,
      style: 'watercolour',
    });
  };

  // Call 2: Select Variant and Generate High-Res Image & Brief
  const handleSelectVariant = async (variant: SceneVariant) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scene-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant,
          style: currentStyle,
          medium: currentStyle,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate picture brief.');
      }

      const brief: SceneBrief = json.brief;
      setCurrentBrief(brief);
      setViewState('brief');
    } catch (err: any) {
      console.error('Brief generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate full picture.');
    } finally {
      setIsLoading(false);
    }
  };

  // Call 3: Stuck Diagnostic
  const handleSubmitStuck = async (data: { problem: string; wipImageBase64?: string }) => {
    if (!currentBrief) return null;

    try {
      const res = await fetch('/api/stuck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: currentBrief,
          problem: data.problem,
          wipImageBase64: data.wipImageBase64,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to get help.');
      }

      const exchange: StuckExchange = json.exchange;

      // Update current brief with new exchange
      const updatedBrief: SceneBrief = {
        ...currentBrief,
        stuck_exchanges: [...(currentBrief.stuck_exchanges || []), exchange],
      };
      setCurrentBrief(updatedBrief);

      // Save updated record to IndexedDB if already saved
      const inGallery = savedBriefs.some((b) => b.id === updatedBrief.id);
      if (inGallery) {
        await saveBriefToStorage(updatedBrief);
        const refreshed = await getSavedBriefs();
        setSavedBriefs(refreshed);
      }

      return exchange;
    } catch (err: any) {
      console.error('Stuck API error:', err);
      setErrorMessage(err?.message || 'Failed to process help request.');
      return null;
    }
  };

  // Call 2.5: Regenerate High-Res Image for current brief
  const handleRegenerateImage = async () => {
    if (!currentBrief) return;

    const { allowed } = checkCapAllowed();
    if (!allowed) {
      setErrorMessage('Daily hard cap ($0.50) reached. Click the budget tracker badge at the top right of the screen to unlock/release the limit for today.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/generate-variant-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentBrief.variant.imagePrompt || currentBrief.variant.title,
          title: currentBrief.variant.title,
          style: currentStyle,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to regenerate picture.');
      }

      setCurrentBrief({
        ...currentBrief,
        image: json.image,
      });

      recordImageGeneration(1);

      setSuccessToast('Generated new picture artwork!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error('Regenerate image error:', err);
      setErrorMessage(err?.message || 'Failed to regenerate picture.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save brief to IndexedDB
  const handleSaveBrief = async () => {
    if (!currentBrief) return;

    try {
      await saveBriefToStorage(currentBrief);
      const refreshed = await getSavedBriefs();
      setSavedBriefs(refreshed);
      setSuccessToast(`Saved "${currentBrief.variant.title}" to gallery.`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error('Error saving brief:', err);
      setErrorMessage('Could not save to gallery.');
    }
  };

  const handleDeleteBrief = async (id: string) => {
    try {
      await deleteBriefFromStorage(id);
      const refreshed = await getSavedBriefs();
      setSavedBriefs(refreshed);
    } catch (err) {
      console.error('Error deleting brief:', err);
    }
  };

  const isBriefSaved = currentBrief ? savedBriefs.some((b) => b.id === currentBrief.id) : false;

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans relative overflow-x-hidden bg-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* Ambient background depth gradients */}
      <div className="fixed top-[-10%] left-[-5%] w-[450px] h-[450px] bg-sky-200/50 rounded-full mix-blend-multiply filter blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[550px] h-[550px] bg-purple-200/50 rounded-full mix-blend-multiply filter blur-3xl pointer-events-none z-0" />
      <div className="fixed top-[30%] right-[10%] w-[350px] h-[350px] bg-amber-100/60 rounded-full mix-blend-multiply filter blur-3xl pointer-events-none z-0" />

      {/* Header */}
      <Header
        onOpenGallery={() => setIsGalleryOpen(true)}
        savedCount={savedBriefs.length}
        onNewTutorial={() => setViewState('input')}
        onSaveCurrent={handleSaveBrief}
        canSave={!!currentBrief}
        isSaved={isBriefSaved}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 relative z-10">
        {/* Navigation Stepper / Breadcrumb */}
        <div className="w-full bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white/80 shadow-sm flex items-center justify-between gap-2 overflow-x-auto print:hidden">
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold text-slate-600">
            <button
              onClick={() => setViewState('input')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                viewState === 'input'
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                  : 'hover:bg-white/80 text-slate-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
              <span>Describe Idea</span>
            </button>

            <span className="text-slate-300 font-black">→</span>

            <button
              disabled={!variants}
              onClick={() => variants && setViewState('variants')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                viewState === 'variants'
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                  : variants
                  ? 'hover:bg-white/80 text-slate-700'
                  : 'opacity-40 cursor-not-allowed text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Choose Take ({variants ? variants.length : 4})</span>
            </button>

            <span className="text-slate-300 font-black">→</span>

            <button
              disabled={!currentBrief}
              onClick={() => currentBrief && setViewState('brief')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                viewState === 'brief'
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                  : currentBrief
                  ? 'hover:bg-white/80 text-slate-700'
                  : 'opacity-40 cursor-not-allowed text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">3</span>
              <span>Painting View</span>
            </button>
          </div>

          {currentIdea && (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 hidden md:block truncate max-w-[240px]">
              Idea: "{currentIdea}"
            </span>
          )}
        </div>

        {/* Toasts */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            {successToast}
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-600 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-sm font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white/80 hover:text-white font-black text-xs uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View State 1: Input Panel */}
        {viewState === 'input' && (
          <InputPanel
            onGenerateVariants={handleGenerateVariants}
            onSelectPreset={handleSelectPreset}
            isLoading={isLoading}
          />
        )}

        {/* View State 2: Variant Picker */}
        {viewState === 'variants' && variants && (
          <VariantPicker
            variants={variants}
            ideaPrompt={currentIdea}
            style={currentStyle}
            onSelectVariant={handleSelectVariant}
            onBackToInput={() => setViewState('input')}
            isLoading={isLoading}
          />
        )}

        {/* View State 3: Full Brief View */}
        {viewState === 'brief' && currentBrief && (
          <BriefView
            brief={currentBrief}
            onOpenStuckModal={() => setIsStuckModalOpen(true)}
            onPrintReference={() => setViewState('reference')}
            onNewScene={() => setViewState('input')}
            onBackToVariants={() => setViewState('variants')}
            onRegenerateImage={handleRegenerateImage}
            isRegeneratingImage={isLoading}
            onSaveBrief={handleSaveBrief}
            isSaved={isBriefSaved}
          />
        )}

        {/* View State 4: Printable Reference Sheet */}
        {viewState === 'reference' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between print:hidden">
              <button
                onClick={() => setViewState('brief')}
                className="px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold"
              >
                Back to Painting View
              </button>
            </div>

            <StepsOverviewGrid
              brief={currentBrief || undefined}
              title={currentBrief?.variant?.title}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white/40 backdrop-blur-md border-t border-slate-200/80 mt-12 py-6 px-4 text-center text-xs text-slate-600 relative z-10 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span>Art Studio</span>
            <span>• Inspiration for young artists</span>
          </div>
          <p className="font-semibold">© 2026 Google AI Studio Build Applet</p>
        </div>
      </footer>

      {/* Stuck Problem Diagnosis Modal */}
      {isStuckModalOpen && currentBrief && (
        <StuckModal
          brief={currentBrief}
          medium={currentBrief.medium}
          onClose={() => setIsStuckModalOpen(false)}
          onSubmitStuck={handleSubmitStuck}
        />
      )}

      {/* Saved Gallery Modal */}
      <SavedGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        savedBriefs={savedBriefs}
        onSelectBrief={(brief) => {
          setCurrentBrief(brief);
          setViewState('brief');
        }}
        onSelectVariant={handleSelectVariant}
        onDeleteBrief={handleDeleteBrief}
      />
    </div>
  );
}
