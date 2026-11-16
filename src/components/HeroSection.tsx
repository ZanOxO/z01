import { ArrowDown } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="top" className="border-b border-white/[0.08] bg-[#090B10]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Core Proposition */}
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="text-xs font-medium tracking-wider text-indigo-400 mb-3">
              Open-Source Super-Resolution Studio
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08] text-balance">
              Bring Your Images Back to Life
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Nâng cấp độ phân giải 2x và 4x bằng mạng nơ-ron ESRGAN mã nguồn mở kết hợp tiền xử lý khử nhiễu và phục hồi vi chi tiết. Vận hành hoàn toàn miễn phí theo cơ chế chia tile tiết kiệm RAM/VRAM.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#studio"
                className="inline-flex items-center gap-2.5 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span>Bắt đầu nâng cấp ảnh</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#architecture"
                className="inline-flex items-center rounded-lg border border-white/[0.1] bg-[#121621] px-5 py-3 text-sm font-medium text-slate-200 hover:bg-[#191E2D] transition-colors whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Xem kiến trúc &amp; mô hình
              </a>
            </div>
          </div>

          {/* Right Column: Precision Optical Media */}
          <div className="lg:col-span-5 flex">
            <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#11141D] min-h-[260px]">
              <img
                src="/src/assets/images/hero_optical_lens_1794824847884.jpg"
                alt="Ống kính quang học đa lớp tượng trưng cho độ sắc nét và phục hồi chi tiết của PixelEnhance AI"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090B10]/85 via-[#090B10]/20 to-transparent"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
                <span>RDN-ESRGAN · Lanczos3 · CLAHE</span>
                <span>2x / 4x Tiled Inference</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Specification Strip */}
        <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-8 lg:grid-cols-4">
          <div className="rounded-lg border border-white/[0.06] bg-[#0F121A] p-4">
            <p className="text-xs text-slate-400">Hệ số phóng đại thực</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-100 tabular-nums">2x / 4x</p>
            <p className="mt-1 text-xs text-slate-400">Bảo toàn tỷ lệ khung hình gốc</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-[#0F121A] p-4">
            <p className="text-xs text-slate-400">Quản lý bộ nhớ Tile</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-100 tabular-nums">64–256 px</p>
            <p className="mt-1 text-xs text-slate-400">Chống tràn RAM trên CPU phổ thông</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-[#0F121A] p-4">
            <p className="text-xs text-slate-400">Chi phí API lõi</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-100 tabular-nums">0 VND</p>
            <p className="mt-1 text-xs text-slate-400">Trọng số mở chạy cục bộ &amp; máy chủ</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-[#0F121A] p-4">
            <p className="text-xs text-slate-400">Định dạng xuất ảnh</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-100 tabular-nums">PNG / JPG</p>
            <p className="mt-1 text-xs text-slate-400">Lossless PNG hoặc JPG 95% 4:4:4</p>
          </div>
        </div>
      </div>
    </section>
  );
}
