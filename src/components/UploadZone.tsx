import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, ScanSearch, X, AlertCircle } from 'lucide-react';
import type { ImageDiagnostic, ImageInfo } from '../types/upscaler';
import { formatBytes } from '../services/upscalePipeline';

interface UploadZoneProps {
  image: ImageInfo | null;
  diagnostic: ImageDiagnostic | null;
  isAnalyzing: boolean;
  isProcessing: boolean;
  error: string | null;
  onSelectFile: (file: File) => void;
  onLoadSample: (id: 'portrait' | 'architecture' | 'macro', label: string) => void;
  onClearImage: () => void;
  onAnalyzeImage: () => void;
  onApplyDiagnostic: (diag: ImageDiagnostic) => void;
}

export function UploadZone({
  image,
  diagnostic,
  isAnalyzing,
  isProcessing,
  error,
  onSelectFile,
  onLoadSample,
  onClearImage,
  onAnalyzeImage,
  onApplyDiagnostic,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-100">
            1. Tải ảnh đầu vào
          </h2>
          <p className="text-xs text-slate-400">
            Hỗ trợ JPG, JPEG, PNG, WEBP · Tối đa 20 MB · Giới hạn 4096px
          </p>
        </div>

        {image && (
          <button
            type="button"
            onClick={onClearImage}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#141824] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#1C2131] hover:text-white disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Đổi ảnh khác</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!image ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isProcessing) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-white/[0.14] bg-[#0F121A] hover:border-indigo-500/50 hover:bg-[#121622]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Chọn tệp ảnh từ thiết bị"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161B28] text-indigo-400">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-100">
            Kéo thả ảnh vào đây hoặc chọn từ thiết bị
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            Ảnh được xử lý tức thì trong bộ nhớ đệm, không lưu trữ lâu dài trên máy chủ
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            <span>Chọn ảnh từ máy</span>
          </button>

          {/* Low-res Test Samples */}
          <div className="mt-7 w-full border-t border-white/[0.06] pt-5">
            <p className="text-xs text-slate-400 mb-3">
              Hoặc thử nhanh với ảnh mẫu độ phân giải thấp (360px):
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onLoadSample('portrait', 'Chân dung Studio')}
                className="rounded-lg border border-white/[0.08] bg-[#151926] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-[#1B2030] transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
              >
                Chân dung Studio
              </button>
              <button
                type="button"
                onClick={() => onLoadSample('architecture', 'Kiến trúc Đô thị')}
                className="rounded-lg border border-white/[0.08] bg-[#151926] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-[#1B2030] transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
              >
                Kiến trúc Đô thị
              </button>
              <button
                type="button"
                onClick={() => onLoadSample('macro', 'Macro Đồng hồ')}
                className="rounded-lg border border-white/[0.08] bg-[#151926] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-[#1B2030] transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
              >
                Macro Đồng hồ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] checkerboard-bg">
              <img
                src={image.objectUrl}
                alt={`Xem trước ${image.name}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="truncate text-sm font-medium text-slate-100">{image.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                <span>{image.width} × {image.height} px</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(image.sizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>{image.mimeType.replace('image/', '').toUpperCase()}</span>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onAnalyzeImage}
                  disabled={isAnalyzing || isProcessing}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
                >
                  <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isAnalyzing ? 'Đang chẩn đoán ảnh...' : 'Phân tích chất lượng ảnh'}</span>
                </button>
              </div>
            </div>
          </div>

          {diagnostic && (
            <div className="border-t border-white/[0.06] pt-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-200">
                  Kết quả chẩn đoán ({diagnostic.source === 'gemini-4-hydrogen' ? 'Gemini 4 Vision' : 'Sharp CV'})
                </p>
                <button
                  type="button"
                  onClick={() => onApplyDiagnostic(diagnostic)}
                  disabled={isProcessing}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer disabled:opacity-50"
                >
                  Áp dụng cấu hình đề xuất
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{diagnostic.summary}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Vấn đề phát hiện:</span>
                <span>{diagnostic.detectedIssues.join(' · ')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
