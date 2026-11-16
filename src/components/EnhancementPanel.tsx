import { Play, Square } from 'lucide-react';
import type { EnhancementSettings, ImageInfo } from '../types/upscaler';
import type { ProgressUpdate } from '../services/upscalePipeline';

interface EnhancementPanelProps {
  image: ImageInfo | null;
  settings: EnhancementSettings;
  isProcessing: boolean;
  progress: ProgressUpdate;
  onUpdateSettings: (patch: Partial<EnhancementSettings>) => void;
  onStartEnhance: () => void;
  onCancelEnhance: () => void;
}

export function EnhancementPanel({
  image,
  settings,
  isProcessing,
  progress,
  onUpdateSettings,
  onStartEnhance,
  onCancelEnhance,
}: EnhancementPanelProps) {
  const expectedW = image ? image.width * settings.scale : 0;
  const expectedH = image ? image.height * settings.scale : 0;

  return (
    <div className="space-y-6 rounded-xl border border-white/[0.08] bg-[#0F121A] p-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-100">
          2. Cấu hình nâng cấp AI
        </h2>
        <p className="text-xs text-slate-400">
          Tinh chỉnh mức phóng đại và các bộ lọc phục hồi giữ màu tự nhiên
        </p>
      </div>

      {/* Upscale Scale 2x / 4x */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-200">Mức độ phóng đại (Upscale)</span>
          {image && (
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {expectedW} × {expectedH} px
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#090B10] p-1 border border-white/[0.06]">
          {([2, 4] as const).map((scaleVal) => (
            <button
              key={scaleVal}
              type="button"
              disabled={isProcessing}
              onClick={() => onUpdateSettings({ scale: scaleVal })}
              className={`rounded-md py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                settings.scale === scaleVal
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              } disabled:opacity-60`}
            >
              {scaleVal}x Upscale
            </button>
          ))}
        </div>
      </div>

      {/* AI Model Selection */}
      <div className="space-y-2">
        <label htmlFor="engine-select" className="block text-xs font-medium text-slate-200">
          Mô hình AI xử lý
        </label>
        <select
          id="engine-select"
          disabled={isProcessing}
          value={settings.engine}
          onChange={(e) => onUpdateSettings({ engine: e.target.value as EnhancementSettings['engine'] })}
          className="w-full rounded-lg border border-white/[0.1] bg-[#090B10] px-3 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none min-h-[40px]"
        >
          <option value="esrgan-medium">ESRGAN Medium (RDN · Chi tiết cân bằng · WebGL/CPU)</option>
          <option value="esrgan-slim">ESRGAN Slim (Nhẹ RAM · Tốc độ cao trên CPU)</option>
          <option value="sharp-cv">Sharp C++ Super-Resolution (Siêu nhanh trên máy chủ)</option>
          <option value="python-realesrgan">Python Real-ESRGAN + GFPGAN (Cần Backend Python)</option>
        </select>
      </div>

      {/* Sliders: Denoise, Sharpen, Detail Recovery */}
      <div className="space-y-4 border-t border-white/[0.06] pt-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="denoise-slider" className="text-slate-200">AI Denoise (Khử nhiễu)</label>
            <span className="font-mono text-slate-400 tabular-nums">{Math.round(settings.denoise * 100)}%</span>
          </div>
          <input
            id="denoise-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={isProcessing}
            value={settings.denoise}
            onChange={(e) => onUpdateSettings({ denoise: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="sharpen-slider" className="text-slate-200">AI Sharpen (Tăng sắc nét)</label>
            <span className="font-mono text-slate-400 tabular-nums">{Math.round(settings.sharpen * 100)}%</span>
          </div>
          <input
            id="sharpen-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={isProcessing}
            value={settings.sharpen}
            onChange={(e) => onUpdateSettings({ sharpen: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="detail-slider" className="text-slate-200">Detail Recovery (Phục hồi vi chi tiết)</label>
            <span className="font-mono text-slate-400 tabular-nums">{Math.round(settings.detailRecovery * 100)}%</span>
          </div>
          <input
            id="detail-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={isProcessing}
            value={settings.detailRecovery}
            onChange={(e) => onUpdateSettings({ detailRecovery: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Face Restoration Toggle */}
        <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
          <div>
            <span className="block text-xs font-medium text-slate-200">Face Restoration</span>
            <span className="block text-[11px] text-slate-400">
              Bảo toàn vùng da &amp; khôi phục nét khuôn mặt tự nhiên
            </span>
          </div>
          <input
            type="checkbox"
            disabled={isProcessing}
            checked={settings.faceRestore}
            onChange={(e) => onUpdateSettings({ faceRestore: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-[#090B10] accent-indigo-600 cursor-pointer"
          />
        </label>
      </div>

      {/* Output Format */}
      <div className="space-y-2 border-t border-white/[0.06] pt-4">
        <span className="block text-xs font-medium text-slate-200">Định dạng xuất ảnh</span>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#090B10] p-1 border border-white/[0.06]">
          {(['png', 'jpg'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              disabled={isProcessing}
              onClick={() => onUpdateSettings({ outputFormat: fmt })}
              className={`rounded-md py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                settings.outputFormat === fmt
                  ? 'bg-[#1D2333] text-slate-100 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              } disabled:opacity-60`}
            >
              {fmt === 'png' ? 'PNG (Lossless)' : 'JPG (95% High)'}
            </button>
          ))}
        </div>
      </div>

      {/* Processing Progress & Action */}
      <div className="border-t border-white/[0.06] pt-4 space-y-3">
        {isProcessing && (
          <div className="space-y-2" aria-live="polite">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 truncate pr-2">{progress.stageLabel}</span>
              <span className="font-mono text-indigo-400 tabular-nums shrink-0">{progress.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#090B10] border border-white/[0.06]">
              <div
                className="h-full bg-indigo-500 transition-[width] duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {!isProcessing ? (
          <button
            type="button"
            disabled={!image}
            onClick={onStartEnhance}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>Nâng cấp ảnh {settings.scale}x ngay</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancelEnhance}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-5 py-3 text-sm font-medium text-rose-200 hover:bg-rose-950/50 transition-colors cursor-pointer min-h-[44px]"
          >
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hủy &amp; giải phóng bộ nhớ</span>
          </button>
        )}
      </div>
    </div>
  );
}
