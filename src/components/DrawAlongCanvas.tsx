import React, { useRef, useState, useEffect } from 'react';
import { Eraser, RotateCcw, Download, Sparkles, Pencil, Layers } from 'lucide-react';

interface DrawAlongCanvasProps {
  guideSvgContent?: React.ReactNode;
  showGuideOverlay?: boolean;
  tutorialId?: string;
}

const COLOR_PALETTE = [
  { name: 'Graphite Black', value: '#1e293b' },
  { name: 'Cadmium Red', value: '#ef4444' },
  { name: 'Vibrant Orange', value: '#f97316' },
  { name: 'Lemon Yellow', value: '#eab308' },
  { name: 'Viridian Green', value: '#22c55e' },
  { name: 'Cobalt Blue', value: '#3b82f6' },
  { name: 'Deep Purple', value: '#a855f7' },
  { name: 'Magenta Pink', value: '#ec4899' },
  { name: 'Burnt Sienna', value: '#78350f' },
];

const STROKE_SIZES = [
  { label: 'Fine', size: 4 },
  { label: 'Medium', size: 8 },
  { label: 'Heavy', size: 14 },
];

export const DrawAlongCanvas: React.FC<DrawAlongCanvasProps> = ({
  guideSvgContent,
  showGuideOverlay = true,
  tutorialId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e293b');
  const [strokeSize, setStrokeSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [guideOpacity, setGuideOpacity] = useState(0.25);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set 500x500 internal coordinate system
    canvas.width = 500;
    canvas.height = 500;

    // Transparent canvas (wrapper div handles background)
    ctx.clearRect(0, 0, 500, 500);

    saveHistoryState();
  }, []);

  // Clear canvas on tutorial change
  useEffect(() => {
    if (!tutorialId) return;
    clearCanvas();
  }, [tutorialId]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, 500, 500);
    setHistory((prev) => [...prev.slice(-7), imageData]); // keep max 8 states (~8MB)
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // remove current state
    const previousState = newHistory[newHistory.length - 1];

    const canvas = canvasRef.current;
    if (!canvas || !previousState) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 500, 500);
    saveHistoryState();
  };

  const getPointerPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = 500 / rect.width;
    const scaleY = 500 / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeSize;

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistoryState();
    }
  };

  const handleDownloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Composite drawing onto a white background canvas so exported PNG is opaque
    const out = document.createElement('canvas');
    out.width = 500;
    out.height = 500;
    const octx = out.getContext('2d');
    if (!octx) return;

    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, 500, 500);
    octx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `my-drawing-${Date.now()}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center w-full glass-panel rounded-[32px] shadow-xl overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="w-full bg-white/30 backdrop-blur-md px-6 py-4 border-b border-white/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Pencil className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-slate-800 text-base">Sketch Pad</h3>
          <span className="bg-purple-100/80 text-purple-800 text-xs font-black px-3 py-1 rounded-full border border-white/50 shadow-sm">
            Practice Pad
          </span>
        </div>

        {/* Guide Opacity Slider */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/40 px-3 py-1.5 rounded-full border border-white/50 backdrop-blur-md">
          <Layers className="w-4 h-4 text-purple-600" />
          <span>Trace Guide:</span>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.05"
            value={guideOpacity}
            onChange={(e) => setGuideOpacity(parseFloat(e.target.value))}
            className="w-20 accent-purple-600 cursor-pointer"
          />
          <span>{Math.round(guideOpacity * 100)}%</span>
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div className="relative w-full aspect-square max-w-[500px] flex items-center justify-center p-6">
        <div className="w-full h-full bg-white/80 backdrop-blur-md rounded-2xl shadow-inner border border-white/80 relative overflow-hidden flex items-center justify-center">
          {/* Background Guide SVG Overlay */}
          {showGuideOverlay && guideSvgContent && (
            <div
              className="absolute inset-0 pointer-events-none select-none flex items-center justify-center transition-opacity"
              style={{ opacity: guideOpacity }}
            >
              <svg
                viewBox="0 0 500 500"
                className="w-full h-full object-contain"
                xmlns="http://www.w3.org/2000/svg"
              >
                {guideSvgContent}
              </svg>
            </div>
          )}

          {/* HTML5 Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full object-contain touch-none cursor-crosshair z-10"
          />
        </div>
      </div>

      {/* Palette & Tool Controls */}
      <div className="w-full bg-white/30 backdrop-blur-md p-5 border-t border-white/50 flex flex-col gap-4">
        {/* Colors Row */}
        <div className="flex items-center justify-center flex-wrap gap-2.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setColor(c.value);
                setIsEraser(false);
              }}
              className={`w-8 h-8 rounded-full border-2 transition active:scale-95 shadow-sm ${
                !isEraser && color === c.value ? 'ring-4 ring-indigo-400 scale-110 border-white' : 'border-white/80'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}

          {/* Eraser Button */}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              isEraser
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white/50 border border-white/60 text-slate-700 hover:bg-white/80'
            }`}
          >
            <Eraser className="w-4 h-4" />
            Eraser
          </button>
        </div>

        {/* Sizes and Action Tools */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-white/40">
          {/* Stroke Thickness */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 mr-1">Brush:</span>
            {STROKE_SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setStrokeSize(s.size)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  strokeSize === s.size ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/50 text-slate-700 border border-white/60 hover:bg-white/80'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Utility Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="px-3 py-1.5 bg-white/50 hover:bg-white/80 border border-white/60 rounded-full text-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition shadow-sm"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo
            </button>

            <button
              onClick={clearCanvas}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 border border-rose-300/50 rounded-full text-xs font-bold transition shadow-sm"
            >
              Clear
            </button>

            <button
              onClick={handleDownloadDrawing}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Save Artwork
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
