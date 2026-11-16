import { Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090B10]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md px-1"
        >
          PixelEnhance AI
        </a>

        {/* Zone 2: Concise single-line nav links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <a
            href="#studio"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-indigo-400"
          >
            Studio
          </a>
          <a
            href="#architecture"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-indigo-400"
          >
            Kiến trúc AI
          </a>
          <a
            href="#optimization"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-indigo-400"
          >
            Tối ưu &amp; Chi phí
          </a>
          <a
            href="#deployment"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-indigo-400"
          >
            Triển khai
          </a>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#141824] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-[#1B2030] hover:border-indigo-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[40px]"
          >
            <Settings className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>Cài đặt</span>
          </button>
        </div>
      </div>
    </header>
  );
}
