import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { UploadZone } from './components/UploadZone';
import { EnhancementPanel } from './components/EnhancementPanel';
import { ComparisonViewer } from './components/ComparisonViewer';
import { ArchitectureBlueprint } from './components/ArchitectureBlueprint';
import { SettingsModal } from './components/SettingsModal';
import {
  analyzeImageQuality,
  fetchSampleLowRes,
  fetchSystemCapabilities,
  runEnhancementPipeline,
  validateAndReadImage,
} from './services/upscalePipeline';
import type { ProgressUpdate } from './services/upscalePipeline';
import type {
  EnhancedResult,
  EnhancementSettings,
  ImageDiagnostic,
  ImageInfo,
  OutputFormat,
  SystemCapabilities,
} from './types/upscaler';

const DEFAULT_SETTINGS: EnhancementSettings = {
  scale: 2,
  engine: 'esrgan-medium',
  denoise: 0.35,
  sharpen: 0.35,
  detailRecovery: 0.45,
  faceRestore: false,
  tileSize: 128,
  outputFormat: 'png',
  pythonBackendUrl: '',
};

export default function App() {
  const [settings, setSettings] = useState<EnhancementSettings>(DEFAULT_SETTINGS);
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [enhanced, setEnhanced] = useState<EnhancedResult | null>(null);
  const [diagnostic, setDiagnostic] = useState<ImageDiagnostic | null>(null);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate>({ percent: 0, stageLabel: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchSystemCapabilities()
      .then(setCapabilities)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (image?.objectUrl) URL.revokeObjectURL(image.objectUrl);
      if (enhanced?.objectUrl) URL.revokeObjectURL(enhanced.objectUrl);
    };
  }, [image, enhanced]);

  const updateSettings = (patch: Partial<EnhancementSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const resetResults = () => {
    if (enhanced?.objectUrl) URL.revokeObjectURL(enhanced.objectUrl);
    setEnhanced(null);
    setDiagnostic(null);
    setError(null);
  };

  const handleSelectFile = async (file: File) => {
    setError(null);
    try {
      const info = await validateAndReadImage(file);
      if (image?.objectUrl) URL.revokeObjectURL(image.objectUrl);
      resetResults();
      setImage(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đọc tệp ảnh.');
    }
  };

  const handleLoadSample = async (id: 'portrait' | 'architecture' | 'macro', label: string) => {
    setError(null);
    try {
      const info = await fetchSampleLowRes(id, label);
      if (image?.objectUrl) URL.revokeObjectURL(image.objectUrl);
      resetResults();
      setImage(info);
      if (id === 'portrait') {
        updateSettings({ faceRestore: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải ảnh mẫu.');
    }
  };

  const handleClearImage = () => {
    if (image?.objectUrl) URL.revokeObjectURL(image.objectUrl);
    setImage(null);
    resetResults();
  };

  const handleAnalyzeImage = async () => {
    if (!image) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const diag = await analyzeImageQuality(image.file);
      setDiagnostic(diag);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chẩn đoán ảnh thất bại.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyDiagnostic = (diag: ImageDiagnostic) => {
    updateSettings({
      scale: diag.recommendedScale,
      denoise: diag.recommendedDenoise,
      sharpen: diag.recommendedSharpen,
      detailRecovery: diag.recommendedDetailRecovery,
      faceRestore: diag.recommendedFaceRestore,
    });
  };

  const handleStartEnhance = async () => {
    if (!image) return;
    setError(null);
    if (enhanced?.objectUrl) URL.revokeObjectURL(enhanced.objectUrl);
    setEnhanced(null);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    setProgress({ percent: 2, stageLabel: 'Đang chuẩn bị pipeline xử lý...' });

    try {
      const result = await runEnhancementPipeline(
        image,
        settings,
        (update) => setProgress(update),
        controller.signal
      );
      setEnhanced(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setProgress({ percent: 0, stageLabel: '' });
      } else {
        setError(err instanceof Error ? err.message : 'Quá trình nâng cấp ảnh gặp lỗi.');
      }
    } finally {
      abortRef.current = null;
      setIsProcessing(false);
    }
  };

  const handleCancelEnhance = () => {
    abortRef.current?.abort();
  };

  const handleDownload = async () => {
    if (!enhanced || !image) return;

    const baseName = image.name.replace(/\.[^.]+$/, '').replace(/\s+/g, '_');
    const targetFormat: OutputFormat = settings.outputFormat;

    let downloadBlob = enhanced.blob;
    if (enhanced.format !== targetFormat) {
      // Re-encode via server Sharp endpoint to guarantee 100% crisp lossless PNG or JPG 95% 4:4:4
      const formData = new FormData();
      formData.append('image', new File([enhanced.blob], 'enhanced.png', { type: enhanced.blob.type }));
      formData.append('mode', 'postprocess');
      formData.append('denoise', '0');
      formData.append('sharpen', '0');
      formData.append('detailRecovery', '0');
      formData.append('outputFormat', targetFormat);

      const res = await fetch('/api/enhance', { method: 'POST', body: formData });
      if (res.ok) {
        downloadBlob = await res.blob();
      }
    }

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${baseName}_${settings.scale}x_PixelEnhance.${targetFormat}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <main className="flex-1">
        <HeroSection />

        {/* Interactive Upscaling Studio */}
        <section id="studio" className="py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* Left Control Column */}
              <div className="lg:col-span-5 space-y-6">
                <UploadZone
                  image={image}
                  diagnostic={diagnostic}
                  isAnalyzing={isAnalyzing}
                  isProcessing={isProcessing}
                  error={error}
                  onSelectFile={handleSelectFile}
                  onLoadSample={handleLoadSample}
                  onClearImage={handleClearImage}
                  onAnalyzeImage={handleAnalyzeImage}
                  onApplyDiagnostic={handleApplyDiagnostic}
                />

                <EnhancementPanel
                  image={image}
                  settings={settings}
                  isProcessing={isProcessing}
                  progress={progress}
                  onUpdateSettings={updateSettings}
                  onStartEnhance={handleStartEnhance}
                  onCancelEnhance={handleCancelEnhance}
                />
              </div>

              {/* Right Before / After Inspection Viewport */}
              <div className="lg:col-span-7">
                <ComparisonViewer
                  original={image}
                  enhanced={enhanced}
                  isProcessing={isProcessing}
                  outputFormat={settings.outputFormat}
                  onChangeFormat={(fmt) => updateSettings({ outputFormat: fmt })}
                  onDownload={handleDownload}
                />
              </div>
            </div>
          </div>
        </section>

        <ArchitectureBlueprint />
      </main>

      <footer className="border-t border-white/[0.08] bg-[#090B10] py-8">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
          <p>PixelEnhance AI · Nền tảng nâng cấp và khôi phục ảnh mã nguồn mở</p>
          <p>RDN-ESRGAN · Sharp C++ · FastAPI Real-ESRGAN / GFPGAN</p>
        </div>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        capabilities={capabilities}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
