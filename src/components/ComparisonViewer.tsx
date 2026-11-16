import { useRef, useState } from 'react';
import { Download, MoveHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { EnhancedResult, ImageInfo, OutputFormat } from '../types/upscaler';
import { formatBytes } from '../services/upscalePipeline';

interface ComparisonViewerProps {
  original: ImageInfo | null;
  enhanced: EnhancedResult | null;
  isProcessing: boolean;
  outputFormat: OutputFormat;
  onChangeFormat: (fmt: OutputFormat) => void;
  onDownload: () => void;
}

export function ComparisonViewer({
  original,
  enhanced,
  isProcessing,
  outputFormat,
  onChangeFormat,
  onDownload,
}: ComparisonViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'split' | 'side'>('split');
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const updateSliderFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  };

  if (!original) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#0F121A] p-8 text-center">
        <p className="font-display text-base font-medium text-slate-200">
          Khu vực so sánh Before / After
        </p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
          Tải ảnh lên hoặc chọn một ảnh mẫu ở cột bên trái, sau đó nhấn &ldquo;Nâng cấp ảnh&rdquo; để kiểm tra độ sắc nét chi tiết theo thời gian thực.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar: View Modes + Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0F121A] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[#090B10] p-1 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Thanh trượt so sánh
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'side'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Song song
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Thu nhỏ"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
            disabled={zoom <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#141824] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="font-mono text-xs text-slate-300 tabular-nums w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Phóng to"
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.5).toFixed(1))))}
            disabled={zoom >= 4}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#141824] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              aria-label="Đặt lại thu phóng"
              onClick={() => setZoom(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#141824] text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Main Comparison Viewport */}
      {viewMode === 'split' ? (
        <div
          ref={containerRef}
          onPointerDown={(e) => {
            if (!enhanced) return;
            setIsDraggingSlider(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            updateSliderFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!isDraggingSlider || !enhanced) return;
            updateSliderFromClientX(e.clientX);
          }}
          onPointerUp={() => setIsDraggingSlider(false)}
          className="relative h-[420px] sm:h-[520px] w-full overflow-hidden rounded-xl border border-white/[0.08] checkerboard-bg select-none touch-none"
        >
          <div
            className="h-full w-full flex items-center justify-center overflow-auto"
          >
            <div
              className="relative h-full w-full transition-transform duration-150 ease-out"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              {/* After (Enhanced) Layer */}
              {enhanced ? (
                <img
                  src={enhanced.objectUrl}
                  alt="Ảnh sau khi nâng cấp AI"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain pointer-events-none"
                />
              ) : (
                <img
                  src={original.objectUrl}
                  alt="Ảnh gốc"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain pointer-events-none"
                />
              )}

              {/* Before (Original) Clipped Layer */}
              {enhanced && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src={original.objectUrl}
                    alt="Ảnh gốc trước xử lý"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Corner Labels */}
          <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-[#090B10]/85 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200 font-mono tabular-nums">
            Before · {original.width}×{original.height}
          </div>
          {enhanced && (
            <div className="pointer-events-none absolute top-3 right-3 rounded-md bg-indigo-950/90 border border-indigo-400/30 px-2.5 py-1 text-[11px] font-medium text-indigo-100 font-mono tabular-nums">
              After · {enhanced.width}×{enhanced.height}
            </div>
          )}

          {/* Interactive Draggable Divider */}
          {enhanced && (
            <div
              role="slider"
              tabIndex={0}
              aria-label="Thanh trượt so sánh Before và After"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPos)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 4));
                if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 4));
              }}
              style={{ left: `${sliderPos}%` }}
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-indigo-400 cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-300/60 bg-[#090B10] text-indigo-300 shadow-lg">
                <MoveHorizontal className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#090B10]/70 backdrop-blur-[2px]">
              <p className="rounded-lg border border-white/10 bg-[#111520] px-4 py-2 text-xs font-medium text-slate-200">
                Đang xử lý khung hình bằng mạng nơ-ron...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2 text-xs text-slate-300 font-mono tabular-nums">
              <span>Before (Gốc)</span>
              <span>{original.width} × {original.height} px</span>
            </div>
            <div className="h-[340px] checkerboard-bg overflow-auto flex items-center justify-center p-2">
              <img
                src={original.objectUrl}
                alt="Ảnh gốc"
                referrerPolicy="no-referrer"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-full max-w-full object-contain transition-transform duration-150"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2 text-xs text-indigo-300 font-mono tabular-nums">
              <span>After (AI Enhanced)</span>
              <span>{enhanced ? `${enhanced.width} × ${enhanced.height} px` : 'Chờ xử lý'}</span>
            </div>
            <div className="h-[340px] checkerboard-bg overflow-auto flex items-center justify-center p-2">
              {enhanced ? (
                <img
                  src={enhanced.objectUrl}
                  alt="Ảnh đã xử lý AI"
                  referrerPolicy="no-referrer"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  className="max-h-full max-w-full object-contain transition-transform duration-150"
                />
              ) : (
                <p className="text-xs text-slate-500">Chưa có kết quả nâng cấp</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download & Metrics Summary Bar */}
      {enhanced && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0F121A] p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-100">
              Kết quả sẵn sàng tải xuống
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
              <span>{enhanced.width} × {enhanced.height} px</span>
              <span aria-hidden="true">·</span>
              <span>{formatBytes(enhanced.sizeBytes)}</span>
              <span aria-hidden="true">·</span>
              <span>{enhanced.processingTimeSec}s</span>
              <span aria-hidden="true">·</span>
              <span>{enhanced.engineLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              aria-label="Định dạng tải xuống"
              value={outputFormat}
              onChange={(e) => onChangeFormat(e.target.value as OutputFormat)}
              className="rounded-lg border border-white/[0.1] bg-[#090B10] px-3 py-2 text-xs text-slate-200 min-h-[40px]"
            >
              <option value="png">PNG Lossless</option>
              <option value="jpg">JPG Quality 95%</option>
            </select>

            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer whitespace-nowrap min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Tải ảnh chất lượng cao</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
