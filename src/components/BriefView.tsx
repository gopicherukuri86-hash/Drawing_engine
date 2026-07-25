import React, { useState } from 'react';
import { SceneBrief } from '../types';
import { checkCapAllowed, recordImageGeneration } from '../utils/costTracker';
import {
  Palette,
  HelpCircle,
  Printer,
  Sun,
  Sparkles,
  Download,
  Paintbrush,
  FileText,
  Loader2,
} from 'lucide-react';

interface BriefViewProps {
  brief: SceneBrief;
  onOpenStuckModal: () => void;
  onPrintReference: () => void;
  onNewScene: () => void;
  onBackToVariants?: () => void;
  onRegenerateImage?: () => void;
  isRegeneratingImage?: boolean;
  onSaveBrief: () => void;
  isSaved?: boolean;
}

export const BriefView: React.FC<BriefViewProps> = ({
  brief,
  onOpenStuckModal,
  onPrintReference,
  onNewScene,
  onBackToVariants,
  onRegenerateImage,
  isRegeneratingImage,
  onSaveBrief,
  isSaved,
}) => {
  const { variant, medium, image, light_note, palette } = brief;
  const [activeTab, setActiveTab] = useState<'color' | 'coloring'>('color');
  const [lineArtImage, setLineArtImage] = useState<string | null>(brief.lineArtImage || null);
  const [isGeneratingLineArt, setIsGeneratingLineArt] = useState<boolean>(false);
  const [lineArtError, setLineArtError] = useState<string | null>(null);

  const handleFetchLineArt = async () => {
    if (lineArtImage || isGeneratingLineArt) return;

    const { allowed } = checkCapAllowed();
    if (!allowed) {
      setLineArtError('Daily hard cap ($0.50) reached. Click the $0.50 budget badge at the top of the screen to unlock/release the cap for today.');
      return;
    }

    setIsGeneratingLineArt(true);
    setLineArtError(null);

    try {
      const res = await fetch('/api/generate-coloring-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: variant.imagePrompt || `${variant.title}. ${variant.description}`,
          title: variant.title,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.image) {
        setLineArtImage(data.image);
        brief.lineArtImage = data.image;
        recordImageGeneration(1);
      } else {
        throw new Error(data.error || 'Failed to generate coloring page.');
      }
    } catch (err: any) {
      console.error('Line art generation error:', err);
      setLineArtError(err?.message || 'Failed to generate coloring page.');
    } finally {
      setIsGeneratingLineArt(false);
    }
  };

  const handleSwitchTab = (tab: 'color' | 'coloring') => {
    setActiveTab(tab);
    if (tab === 'coloring' && !lineArtImage) {
      handleFetchLineArt();
    }
  };

  const handlePrintColoringPage = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${variant.title} - Coloring Page</title>
          <style>
            body { margin: 0; padding: 20px; font-family: sans-serif; text-align: center; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            p { font-size: 14px; color: #555; margin-bottom: 20px; }
            img { max-width: 90vw; max-height: 80vh; object-contain: fit; border: 2px solid #000; border-radius: 12px; }
            @media print {
              body { padding: 0; }
              img { max-width: 100%; max-height: 90vh; border: none; }
            }
          </style>
        </head>
        <body>
          <h1>${variant.title}</h1>
          <p>Uncolored Line Art Coloring Sheet • Ready to Color with Crayons, Watercolours, or Colored Pencils!</p>
          <img src="${lineArtImage}" alt="${variant.title} Coloring Page" />
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = (imgSrc: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8 p-4 md:p-6 animate-fade-in pb-24">
      {/* Top Banner */}
      <div className="w-full glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/70 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-600 text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
              {medium}
            </span>
            <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Ready to Paint & Color
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {variant.title}
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-600 mt-1">
            {variant.description || variant.pitch}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onBackToVariants && (
            <button
              onClick={onBackToVariants}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              ← Back to Takes
            </button>
          )}

          {onRegenerateImage && (
            <button
              onClick={onRegenerateImage}
              disabled={isRegeneratingImage}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
              {isRegeneratingImage ? 'Regenerating...' : 'Regenerate Picture'}
            </button>
          )}

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
            Print Guide
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
            {isSaved ? 'Saved' : 'Save Picture'}
          </button>

          <button
            onClick={onNewScene}
            className="px-3.5 py-2.5 bg-white/50 hover:bg-white text-slate-700 rounded-full font-bold text-xs border border-white/70"
          >
            New Idea
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs: Full Color vs Coloring Page */}
      <div className="w-full bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-2 max-w-xl mx-auto shadow-inner border border-slate-300">
        <button
          onClick={() => handleSwitchTab('color')}
          className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'color'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Paintbrush className="w-4 h-4 text-indigo-600" />
          <span>🎨 Full Color Painting</span>
        </button>

        <button
          onClick={() => handleSwitchTab('coloring')}
          className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'coloring'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>🖍️ Coloring Page (Line Art)</span>
        </button>
      </div>

      {/* Main Artwork Display Container */}
      <div className="w-full bg-white rounded-3xl p-4 md:p-6 shadow-2xl border border-slate-200/80 flex flex-col items-center gap-4 relative">
        {/* TAB 1: Full Color Painting View */}
        {activeTab === 'color' && (
          <>
            {image ? (
              <div className="w-full max-h-[70vh] rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center shadow-inner relative group">
                <img
                  src={image}
                  alt={variant.title}
                  className="w-full h-full object-contain max-h-[70vh] select-none"
                />
                <button
                  onClick={() => handleDownloadImage(image, `${variant.title}-full-color.png`)}
                  className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-md opacity-90 hover:opacity-100 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Full Color
                </button>
              </div>
            ) : (
              <div className="w-full h-80 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-medium">
                Generating artwork...
              </div>
            )}

            {/* Light Note */}
            {light_note && (
              <div className="w-full bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs md:text-sm font-medium text-slate-800">
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>Lighting tip:</strong> {light_note}</span>
              </div>
            )}
          </>
        )}

        {/* TAB 2: Printable Line Art Coloring Page View */}
        {activeTab === 'coloring' && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Printable Coloring Sheet</h3>
                  <p className="text-xs text-amber-800 font-medium">
                    Clean black-and-white outlines ready to print out and color with crayons, watercolors, or pencils!
                  </p>
                </div>
              </div>

              {lineArtImage && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handlePrintColoringPage}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-full shadow-md flex items-center gap-1.5 active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    Print Coloring Sheet
                  </button>

                  <button
                    onClick={() => handleDownloadImage(lineArtImage, `${variant.title}-coloring-sheet.png`)}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 rounded-full shadow-sm flex items-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>

            {/* Coloring Page Image or Loader */}
            {isGeneratingLineArt ? (
              <div className="w-full h-96 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-600">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="font-bold text-sm">Generating clean black-and-white outline page...</span>
                <span className="text-xs text-slate-500">Creating printable line art for coloring.</span>
              </div>
            ) : lineArtError ? (
              <div className="w-full p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center flex flex-col items-center gap-3">
                <p className="font-bold text-sm">{lineArtError}</p>
                <button
                  onClick={handleFetchLineArt}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full"
                >
                  Try Again
                </button>
              </div>
            ) : lineArtImage ? (
              <div className="w-full max-h-[75vh] rounded-2xl overflow-hidden bg-white p-4 border-2 border-slate-200 flex items-center justify-center shadow-lg">
                <img
                  src={lineArtImage}
                  alt={`${variant.title} Coloring Page`}
                  className="w-full h-full object-contain max-h-[70vh] select-none"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Colour Palette Strip */}
      {palette && palette.swatches && palette.swatches.length > 0 && (
        <div className="w-full glass-panel p-6 rounded-3xl flex flex-col gap-3 border border-white/70 shadow-lg">
          <div className="flex items-center gap-2 text-rose-800">
            <Palette className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-black text-slate-900">Colour Palette Guide</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {palette.swatches.map((swatch, idx) => (
              <div
                key={`swatch-${idx}`}
                className="bg-white/80 rounded-2xl p-3 border border-white/90 shadow-sm flex flex-col items-center text-center gap-2"
              >
                <div
                  className="w-12 h-12 rounded-xl shadow-inner border border-slate-300"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="font-bold text-slate-900 text-xs capitalize truncate w-full" title={swatch.color_name || swatch.pigment_name}>
                  {swatch.color_name || swatch.pigment_name || 'color'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bottom Help Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={onOpenStuckModal}
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm rounded-full shadow-2xl flex items-center gap-2 border-2 border-white transition active:scale-95"
        >
          <HelpCircle className="w-5 h-5" />
          I'm Stuck
        </button>
      </div>
    </div>
  );
};
