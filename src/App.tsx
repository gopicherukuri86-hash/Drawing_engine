import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { DrawingStage } from './components/DrawingStage';
import { DrawAlongCanvas } from './components/DrawAlongCanvas';
import { StepsOverviewGrid } from './components/StepsOverviewGrid';
import { SavedGalleryModal } from './components/SavedGalleryModal';
import { SAMPLE_DINOSAUR_STEPS } from './data/presets';
import { DrawingStep, DrawingTutorial, DrawingPreset } from './types';
import { Sparkles, Play, Grid, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTutorial, setCurrentTutorial] = useState<DrawingTutorial>({
    id: 'sample-baby-dino',
    title: 'Cute Baby Dinosaur',
    subject: 'A cute baby dinosaur standing happily',
    steps: SAMPLE_DINOSAUR_STEPS,
    createdAt: new Date().toISOString(),
    sourceType: 'preset',
  });

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'stage' | 'grid'>('stage');
  const [activeStageTab, setActiveStageTab] = useState<'guide' | 'practice' | 'split'>('split');
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Gallery Modal & LocalStorage
  const [savedTutorials, setSavedTutorials] = useState<DrawingTutorial[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Load saved tutorials from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('reconstructive_drawing_tutorials');
      if (stored) {
        setSavedTutorials(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading saved tutorials:', err);
    }
  }, []);

  // Save tutorials array to localStorage
  const saveTutorialsToStorage = (updated: DrawingTutorial[]) => {
    setSavedTutorials(updated);
    try {
      localStorage.setItem('reconstructive_drawing_tutorials', JSON.stringify(updated));
    } catch (err) {
      console.error('Error storing tutorials:', err);
    }
  };

  // Auto-play timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoPlay && currentTutorial.steps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= currentTutorial.steps.length - 1) {
            setAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 4000); // 4 seconds per step
    }
    return () => clearInterval(timer);
  }, [autoPlay, currentTutorial]);

  // Handle generating new tutorial via API
  const handleGenerate = async (data: {
    prompt?: string;
    imageBase64?: string;
    mimeType?: string;
    complexity: 'easy' | 'standard' | 'detailed';
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setAutoPlay(false);

    try {
      const res = await fetch('/api/generate-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate drawing instructions.');
      }

      const generatedSteps: DrawingStep[] = json.steps;

      if (!generatedSteps || generatedSteps.length === 0) {
        throw new Error('No valid drawing steps were returned.');
      }

      const title = data.prompt
        ? data.prompt.charAt(0).toUpperCase() + data.prompt.slice(1)
        : 'Deconstructed Photo Drawing';

      const newTut: DrawingTutorial = {
        id: `tut-${Date.now()}`,
        title,
        subject: data.prompt || 'Uploaded Image',
        steps: generatedSteps,
        createdAt: new Date().toISOString(),
        sourceType: data.imageBase64 ? 'image' : 'text',
        originalImage: data.imageBase64,
      };

      setCurrentTutorial(newTut);
      setCurrentStepIndex(0);
      setViewMode('stage');
      setSuccessToast(`Drawing guide for "${title}" created successfully! 🎨`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(err?.message || 'An error occurred while generating the drawing steps.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting preset
  const handleSelectPreset = (preset: DrawingPreset) => {
    if (preset.sampleSteps) {
      // Use pre-baked steps instantly
      const newTut: DrawingTutorial = {
        id: `preset-${preset.id}`,
        title: preset.title,
        subject: preset.prompt,
        steps: preset.sampleSteps,
        createdAt: new Date().toISOString(),
        sourceType: 'preset',
      };
      setCurrentTutorial(newTut);
      setCurrentStepIndex(0);
      setViewMode('stage');
      setSuccessToast(`Loaded preset: "${preset.title}"`);
      setTimeout(() => setSuccessToast(null), 3000);
    } else {
      // Generate via API using preset prompt
      handleGenerate({
        prompt: preset.prompt,
        complexity: 'standard',
      });
    }
  };

  // Save current tutorial to gallery
  const handleSaveCurrent = () => {
    const isAlreadySaved = savedTutorials.some((t) => t.id === currentTutorial.id);
    if (isAlreadySaved) return;

    const updated = [currentTutorial, ...savedTutorials];
    saveTutorialsToStorage(updated);
    setSuccessToast(`Saved "${currentTutorial.title}" to your gallery! 📚`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeleteTutorial = (id: string) => {
    const updated = savedTutorials.filter((t) => t.id !== id);
    saveTutorialsToStorage(updated);
  };

  const isCurrentSaved = savedTutorials.some((t) => t.id === currentTutorial.id);

  // Accumulated SVGs up to currentStepIndex for Draw Along Pad overlay
  const currentAccumulatedSvgCodes = currentTutorial.steps
    .slice(0, currentStepIndex + 1)
    .map((s) => s.svg_code)
    .join('\n');

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Animated Ambient Background Spheres for Frosted Glass Depth */}
      <div className="fixed top-[-10%] left-[-5%] w-[450px] h-[450px] bg-sky-300 rounded-full mix-blend-multiply filter blur-3xl opacity-35 pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[550px] h-[550px] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-35 pointer-events-none z-0" />
      <div className="fixed top-[30%] right-[10%] w-[350px] h-[350px] bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 pointer-events-none z-0" />

      {/* Header */}
      <Header
        onOpenGallery={() => setIsGalleryOpen(true)}
        savedCount={savedTutorials.length}
        onNewTutorial={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSaveCurrent={handleSaveCurrent}
        canSave={currentTutorial.steps.length > 0}
        isSaved={isCurrentSaved}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 relative z-10">
        {/* Toast Alerts */}
        {successToast && (
          <div className="bg-emerald-500/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-xl border border-white/40 flex items-center gap-2 text-sm font-bold animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            {successToast}
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-500/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-xl border border-white/40 flex items-center justify-between gap-3 text-sm font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
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

        {/* Input Panel (New Idea / Photo / Preset) */}
        <InputPanel
          onGenerate={handleGenerate}
          onSelectPreset={handleSelectPreset}
          isLoading={isLoading}
        />

        {/* View Mode Bar */}
        <div className="glass-panel p-2.5 rounded-[24px] shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('stage')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 ${
                viewMode === 'stage'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white/40 text-slate-700 hover:bg-white/70 border border-white/50'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              Interactive Step Stage
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white/40 text-slate-700 hover:bg-white/70 border border-white/50'
              }`}
            >
              <Grid className="w-4 h-4" />
              All Steps Overview
            </button>
          </div>

          {/* Sub-tabs for Stage View */}
          {viewMode === 'stage' && (
            <div className="flex items-center gap-1.5 bg-white/40 border border-white/50 p-1.5 rounded-full backdrop-blur-md">
              <button
                onClick={() => setActiveStageTab('split')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeStageTab === 'split'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setActiveStageTab('guide')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeStageTab === 'guide'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Guide Only
              </button>
              <button
                onClick={() => setActiveStageTab('practice')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeStageTab === 'practice'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Draw Pad
              </button>
            </div>
          )}
        </div>

        {/* View Mode 1: Interactive Stage & Practice Pad */}
        {viewMode === 'stage' && (
          <div className="w-full">
            {activeStageTab === 'split' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <DrawingStage
                  steps={currentTutorial.steps}
                  currentStepIndex={currentStepIndex}
                  onStepChange={(idx) => setCurrentStepIndex(idx)}
                  title={currentTutorial.title}
                  autoPlay={autoPlay}
                  onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
                  playSpeedMs={4000}
                />

                <DrawAlongCanvas
                  guideSvgContent={
                    <g dangerouslySetInnerHTML={{ __html: currentAccumulatedSvgCodes }} />
                  }
                  showGuideOverlay={true}
                />
              </div>
            ) : activeStageTab === 'guide' ? (
              <div className="max-w-2xl mx-auto w-full">
                <DrawingStage
                  steps={currentTutorial.steps}
                  currentStepIndex={currentStepIndex}
                  onStepChange={(idx) => setCurrentStepIndex(idx)}
                  title={currentTutorial.title}
                  autoPlay={autoPlay}
                  onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
                  playSpeedMs={4000}
                />
              </div>
            ) : (
              <div className="max-w-2xl mx-auto w-full">
                <DrawAlongCanvas
                  guideSvgContent={
                    <g dangerouslySetInnerHTML={{ __html: currentAccumulatedSvgCodes }} />
                  }
                  showGuideOverlay={true}
                />
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Printable Steps Grid */}
        {viewMode === 'grid' && (
          <StepsOverviewGrid
            steps={currentTutorial.steps}
            title={currentTutorial.title}
            onSelectStep={(idx) => {
              setCurrentStepIndex(idx);
              setViewMode('stage');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white/20 backdrop-blur-md border-t border-white/30 mt-12 py-6 px-4 text-center text-xs text-slate-700 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Reconstructive Drawing Engine • Frosted Glass Kids Studio</span>
          </div>
          <p className="font-semibold text-slate-600">© 2026 Google AI Studio Build Applet</p>
        </div>
      </footer>

      {/* Gallery Modal */}
      <SavedGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        savedTutorials={savedTutorials}
        onSelectTutorial={(tut) => {
          setCurrentTutorial(tut);
          setCurrentStepIndex(0);
          setViewMode('stage');
        }}
        onDeleteTutorial={handleDeleteTutorial}
      />
    </div>
  );
}
