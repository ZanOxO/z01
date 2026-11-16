import { useState } from 'react';

type BlueprintTab = 'architecture' | 'optimization' | 'deployment';

export function ArchitectureBlueprint() {
  const [activeTab, setActiveTab] = useState<BlueprintTab>('architecture');

  return (
    <section id="architecture" className="border-t border-white/[0.08] bg-[#090B10] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-100 sm:text-3xl">
              Kiến trúc hệ thống, Tối ưu &amp; Triển khai
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Tách biệt rõ Frontend, Pipeline xử lý thị giác máy tính và lõi AI mã nguồn mở nhằm đạt hiệu năng cao nhất với ngân sách bằng không.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#11141D] p-1 border border-white/[0.08] self-start">
            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Kiến trúc &amp; Mô hình
            </button>
            <button
              type="button"
              id="optimization"
              onClick={() => setActiveTab('optimization')}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'optimization'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Tối ưu &amp; Chi phí
            </button>
            <button
              type="button"
              id="deployment"
              onClick={() => setActiveTab('deployment')}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'deployment'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Thư mục &amp; Triển khai
            </button>
          </div>
        </div>

        {activeTab === 'architecture' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                01. Luồng xử lý 3 tầng tách biệt
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Tiền xử lý ảnh đầu vào bằng thư viện C++ libvips (Sharp) hoặc OpenCV để khử nhiễu nén JPEG trước khi đưa vào mạng nơ-ron. Sau khi phóng đại 2x/4x, bước hậu xử lý thực hiện CLAHE trên kênh độ sáng (Luminance) và Unsharp Mask nhẹ để giữ màu sắc tự nhiên.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                02. Lựa chọn mô hình AI mã nguồn mở
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Sử dụng <strong>RDN-ESRGAN (Medium &amp; Slim)</strong> chạy trực tiếp trên WebGL/CPU trình duyệt với trọng số cục bộ không phụ thuộc CDN, kết hợp tùy chọn kết nối microservice <strong>Python FastAPI + Real-ESRGAN + GFPGAN v1.4</strong> cho tác vụ phục hồi khuôn mặt chuyên sâu.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                03. Bảo mật dữ liệu &amp; Bộ nhớ đệm
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Toàn bộ ảnh tải lên được xử lý trực tiếp trên RAM (MemoryStorage), không ghi tệp tạm vĩnh viễn xuống ổ cứng. Tensor WebGL/PyTorch được thu hồi ngay sau khi hoàn tất hoặc khi người dùng bấm Hủy.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'optimization' && (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0F121A]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Chế độ xử lý</th>
                  <th className="px-5 py-3.5 font-medium">Phần cứng yêu cầu</th>
                  <th className="px-5 py-3.5 font-medium">Kỹ thuật tiết kiệm RAM/VRAM</th>
                  <th className="px-5 py-3.5 font-medium text-right">Chi phí API</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-slate-100">ESRGAN Medium / Slim</td>
                  <td className="px-5 py-3.5">Trình duyệt (WebGL GPU hoặc CPU)</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">Tile 64px–256px · padding 4px · dispose()</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-emerald-400">0 VND</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-slate-100">Sharp C++ Lanczos3 + CLAHE</td>
                  <td className="px-5 py-3.5">Server CPU phổ thông (1–2 GB RAM)</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">Streaming libvips buffer · 2-pass 4x</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-emerald-400">0 VND</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-slate-100">Python Real-ESRGAN + GFPGAN</td>
                  <td className="px-5 py-3.5">CPU 4GB+ hoặc GPU CUDA / HF ZeroGPU</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">tile=192..256 · gc.collect() · empty_cache()</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-emerald-400">0 VND</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-slate-100">Chẩn đoán ảnh thông minh</td>
                  <td className="px-5 py-3.5">Gemini 4 Hydrogen (Free) / Sharp CV</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">Thumbnail 512px · Local CV Fallback</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-emerald-400">0 VND</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'deployment' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Cấu trúc dự án chuẩn tách tầng
              </h3>
              <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#090B10] p-4 font-mono text-xs leading-relaxed text-slate-300">
{`pixelenhance-ai/
├── src/
│   ├── components/         # UploadZone, EnhancementPanel, ComparisonViewer
│   ├── services/           # upscalePipeline.ts (Tiled ESRGAN WebGL/CPU)
│   └── types/              # Định nghĩa cấu hình và dữ liệu ảnh
├── server.ts               # Express API Gateway + Sharp C++ CV + Weights
└── backend/                # Microservice Python tách rời
    ├── main.py             # FastAPI endpoint /api/v1/upscale
    ├── ai_engine.py        # Real-ESRGAN + GFPGAN + OpenCV Tiled Engine
    ├── requirements.txt    # PyTorch, OpenCV, Basicsr, RealESRGAN
    └── Dockerfile          # Đóng gói chạy CPU/GPU chi phí thấp`}
              </pre>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0F121A] p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Giới hạn phần cứng &amp; Hosting miễn phí
              </h3>
              <ul className="space-y-2.5 text-xs leading-relaxed text-slate-300">
                <li>
                  <strong className="text-slate-100">Chạy Local PC:</strong> Node.js 20+ chạy ngay trên CPU/WebGL bằng <code className="font-mono text-indigo-300">npm run dev</code>. Có thể bật thêm <code className="font-mono text-indigo-300">uvicorn main:app --port 8000</code> trong thư mục <code className="font-mono text-indigo-300">backend/</code>.
                </li>
                <li>
                  <strong className="text-slate-100">Hosting miễn phí đề xuất:</strong> Hugging Face Spaces (CPU Basic 16 GB RAM miễn phí) cho <code className="font-mono text-indigo-300">backend/Dockerfile</code>; Render Free hoặc Railway cho Gateway Node.js.
                </li>
                <li>
                  <strong className="text-slate-100">Lưu ý tài nguyên:</strong> Trên máy chủ chỉ có CPU (2–4 GB RAM), giới hạn ảnh đầu vào ≤ 1280px khi chạy Real-ESRGAN 4x và giữ Tile ở mức 64px–192px để tránh lỗi tràn bộ nhớ (OOM).
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
