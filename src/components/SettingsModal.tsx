import { X } from 'lucide-react';
import type { EnhancementSettings, SystemCapabilities, TileSizeOption } from '../types/upscaler';

interface SettingsModalProps {
  isOpen: boolean;
  settings: EnhancementSettings;
  capabilities: SystemCapabilities | null;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<EnhancementSettings>) => void;
}

export function SettingsModal({
  isOpen,
  settings,
  capabilities,
  onClose,
  onUpdateSettings,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#0F121A] p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 id="settings-modal-title" className="font-display text-lg font-semibold text-slate-100">
            Cài đặt hệ thống &amp; Tài nguyên
          </h2>
          <button
            type="button"
            aria-label="Đóng cài đặt"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#151A27] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tile Size Selector */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-200">
            Kích thước vùng cắt (Tile Size) cho mạng nơ-ron
          </span>
          <p className="text-xs text-slate-400">
            Tile nhỏ giúp tránh tràn RAM/VRAM trên thiết bị yếu; tile lớn xử lý nhanh hơn trên GPU.
          </p>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#090B10] p-1 border border-white/[0.06]">
            {([64, 128, 256] as TileSizeOption[]).map((tile) => (
              <button
                key={tile}
                type="button"
                onClick={() => onUpdateSettings({ tileSize: tile })}
                className={`rounded-md py-2 text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer ${
                  settings.tileSize === tile
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tile} × {tile} px
              </button>
            ))}
          </div>
        </div>

        {/* Optional Python Real-ESRGAN Endpoint */}
        <div className="space-y-2">
          <label htmlFor="python-url-input" className="block text-xs font-medium text-slate-200">
            Địa chỉ Python FastAPI Backend (Tùy chọn)
          </label>
          <input
            id="python-url-input"
            type="url"
            placeholder="http://localhost:8000"
            value={settings.pythonBackendUrl}
            onChange={(e) => onUpdateSettings({ pythonBackendUrl: e.target.value })}
            className="w-full rounded-lg border border-white/[0.1] bg-[#090B10] px-3.5 py-2.5 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400">
            Chỉ cần điền khi bạn tự chạy microservice <code className="font-mono text-slate-300">backend/main.py</code> (Real-ESRGAN + GFPGAN) trên máy cá nhân hoặc Hugging Face Spaces.
          </p>
        </div>

        {/* Live Server Hardware Snapshot */}
        {capabilities && (
          <div className="rounded-lg border border-white/[0.06] bg-[#090B10] p-4 space-y-2 text-xs">
            <p className="font-medium text-slate-200">Thông số môi trường máy chủ hiện tại</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-slate-400 font-mono tabular-nums">
              <span>CPU Cores: {capabilities.cpus} vCPU</span>
              <span>RAM trống: {capabilities.freeMemMb} / {capabilities.totalMemMb} MB</span>
              <span>Chẩn đoán AI: {capabilities.geminiConfigured ? 'Gemini 4 + CV' : 'Sharp CV cục bộ'}</span>
              <span>Python Backend: {capabilities.pythonBackendUrl ? 'Đã kết nối' : 'Chưa cấu hình'}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer min-h-[40px]"
          >
            Lưu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
