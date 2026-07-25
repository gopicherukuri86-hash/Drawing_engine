import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { VariantPicker } from './components/VariantPicker';
import { BriefView } from './components/BriefView';
import { StuckModal } from './components/StuckModal';
import { StepsOverviewGrid } from './components/StepsOverviewGrid';
import { SavedGalleryModal } from './components/SavedGalleryModal';
import { SceneVariant, SceneBrief, Medium, ScenePreset, StuckExchange } from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [viewState, setViewState] = useState<'input' | 'variants' | 'brief' | 'reference'>('input');
  const [currentIdea, setCurrentIdea] = useState<string>('');
  const [currentMedium, setCurrentMedium] = useState<Medium>('watercolour');
  const [variants, setVariants] = useState<SceneVariant[] | null>(null);
  const [currentBrief, setCurrentBrief] = useState<SceneBrief | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [isStuckModalOpen, setIsStuckModalOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [savedBriefs, setSavedBriefs] = useState<SceneBrief[]>([]);

  // Load saved briefs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('reconstructive_scene_briefs');
      if (stored) {
        setSavedBriefs(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading saved briefs:', err);
    }
  }, []);

  const saveBriefsToStorage = (updated: SceneBrief[]) => {
    setSavedBriefs(updated);
    try {
      localStorage.setItem('reconstructive_scene_briefs', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving briefs to storage:', err);
    }
  };

  // Call 1: Generate Composition Variants
  const handleGenerateVariants = async (data: {
    idea: string;
    medium: Medium;
    referenceImageBase64?: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentIdea(data.idea);
    setCurrentMedium(data.medium);

    try {
      const res = await fetch('/api/scene-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate scene variants.');
      }

      setVariants(json.variants);
      setViewState('variants');
    } catch (err: any) {
      console.error('Variant generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate composition variants.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Preset Seed Selection
  const handleSelectPreset = (preset: ScenePreset) => {
    handleGenerateVariants({
      idea: preset.prompt,
      medium: 'watercolour',
    });
  };

  // Call 2: Select Variant and Generate Full Brief
  const handleSelectVariant = async (variant: SceneVariant) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scene-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant,
          medium: currentMedium,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate artist brief.');
      }

      const brief: SceneBrief = json.brief;
      setCurrentBrief(brief);
      setViewState('brief');
    } catch (err: any) {
      console.error('Brief generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate full artist brief.');
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
        throw new Error(json.error || 'Failed to diagnose painting issue.');
      }

      const exchange: StuckExchange = json.exchange;

      // Update current brief with new exchange
      const updatedBrief: SceneBrief = {
        ...currentBrief,
        stuck_exchanges: [...(currentBrief.stuck_exchanges || []), exchange],
      };
      setCurrentBrief(updatedBrief);

      // If already in gallery, update gallery record as well
      const inGallery = savedBriefs.some((b) => b.id === updatedBrief.id);
      if (inGallery) {
        const updatedGallery = savedBriefs.map((b) => (b.id === updatedBrief.id ? updatedBrief : b));
        saveBriefsToStorage(updatedGallery);
      }

      return exchange;
    } catch (err: any) {
      console.error('Stuck API error:', err);
      setErrorMessage(err?.message || 'Failed to process diagnostic query.');
      return null;
    }
  };

  // Save brief
  const handleSaveBrief = () => {
    if (!currentBrief) return;
    const exists = savedBriefs.some((b) => b.id === currentBrief.id);
    if (exists) return;

    const updated = [currentBrief, ...savedBriefs];
    saveBriefsToStorage(updated);
    setSuccessToast(`Saved "${currentBrief.variant.title}" to gallery.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeleteBrief = (id: string) => {
    const updated = savedBriefs.filter((b) => b.id !== id);
    saveBriefsToStorage(updated);
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 relative z-10">
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
            medium={currentMedium}
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
                Back to Interactive Brief
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
            <span>Reconstructive Scene Studio</span>
            <span>• Character in Environment Reference Engine</span>
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
        onDeleteBrief={handleDeleteBrief}
      />
    </div>
  );
}
