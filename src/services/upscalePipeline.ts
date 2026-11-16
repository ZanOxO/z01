import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import esrganMediumX2 from '@upscalerjs/esrgan-medium/2x';
import esrganMediumX4 from '@upscalerjs/esrgan-medium/4x';
import esrganSlimX2 from '@upscalerjs/esrgan-slim/2x';
import esrganSlimX4 from '@upscalerjs/esrgan-slim/4x';
import type {
  EnhancedResult,
  EnhancementSettings,
  ImageDiagnostic,
  ImageInfo,
  SystemCapabilities,
} from '../types/upscaler';

export interface ProgressUpdate {
  percent: number;
  stageLabel: string;
}

const MAX_CLIENT_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function validateAndReadImage(file: File): Promise<ImageInfo> {
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, JPEG, PNG hoặc WEBP.');
  }
  if (file.size > MAX_CLIENT_FILE_BYTES) {
    throw new Error('Dung lượng ảnh vượt quá 20 MB. Vui lòng chọn ảnh nhỏ hơn để đảm bảo ổn định RAM.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Không thể đọc dữ liệu ảnh. Tệp có thể bị hỏng.'));
      img.src = objectUrl;
    });

    if (Math.max(dims.width, dims.height) > 4096) {
      URL.revokeObjectURL(objectUrl);
      throw new Error(`Kích thước ảnh (${dims.width}×${dims.height} px) vượt quá giới hạn tối đa 4096px.`);
    }

    return {
      file,
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      width: dims.width,
      height: dims.height,
      objectUrl,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export async function fetchSampleLowRes(sampleId: 'portrait' | 'architecture' | 'macro', label: string): Promise<ImageInfo> {
  const res = await fetch(`/api/sample-lowres/${sampleId}`);
  if (!res.ok) {
    throw new Error('Không thể tải ảnh mẫu từ máy chủ.');
  }
  const blob = await res.blob();
  const file = new File([blob], `sample_${sampleId}_lowres.jpg`, { type: 'image/jpeg' });
  const info = await validateAndReadImage(file);
  return { ...info, name: `${label} (Mẫu 360px)` };
}

export async function fetchSystemCapabilities(): Promise<SystemCapabilities> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error('Không thể kiểm tra trạng thái máy chủ.');
  }
  return res.json();
}

export async function analyzeImageQuality(file: File): Promise<ImageDiagnostic> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/analyze-image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Phân tích chất lượng ảnh thất bại.');
  }

  return res.json();
}

function getLocalModelConfig(engine: 'esrgan-medium' | 'esrgan-slim', scale: 2 | 4) {
  if (engine === 'esrgan-slim') {
    const base = scale === 4 ? esrganSlimX4 : esrganSlimX2;
    return {
      ...base,
      path: `/models/esrgan-slim/x${scale}/model.json`,
    };
  }
  const base = scale === 4 ? esrganMediumX4 : esrganMediumX2;
  return {
    ...base,
    path: `/models/esrgan-medium/x${scale}/model.json`,
  };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không thể nạp khung hình vào bộ xử lý neural.'));
    img.src = src;
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function runEnhancementPipeline(
  image: ImageInfo,
  settings: EnhancementSettings,
  onProgress: (update: ProgressUpdate) => void,
  signal: AbortSignal
): Promise<EnhancedResult> {
  const startedAt = performance.now();

  if (settings.engine === 'sharp-cv' || settings.engine === 'python-realesrgan') {
    onProgress({
      percent: 25,
      stageLabel: settings.engine === 'python-realesrgan'
        ? 'Đang gửi ảnh tới Python Real-ESRGAN Microservice...'
        : 'Đang xử lý siêu phân giải CPU trên máy chủ (Sharp Lanczos3 + CLAHE)...',
    });

    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('mode', settings.engine === 'python-realesrgan' ? 'python-realesrgan' : 'server-upscale');
    formData.append('scale', String(settings.scale));
    formData.append('denoise', String(settings.denoise));
    formData.append('sharpen', String(settings.sharpen));
    formData.append('detailRecovery', String(settings.detailRecovery));
    formData.append('faceRestore', String(settings.faceRestore));
    formData.append('outputFormat', settings.outputFormat);
    if (settings.pythonBackendUrl.trim()) {
      formData.append('pythonBackendUrl', settings.pythonBackendUrl.trim());
    }

    const res = await fetch('/api/enhance', {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Quá trình xử lý ảnh trên máy chủ thất bại.');
    }

    onProgress({ percent: 90, stageLabel: 'Đang hoàn tất tệp ảnh đầu ra...' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const outW = Number(res.headers.get('X-Output-Width')) || image.width * settings.scale;
    const outH = Number(res.headers.get('X-Output-Height')) || image.height * settings.scale;

    onProgress({ percent: 100, stageLabel: 'Hoàn tất nâng cấp ảnh.' });

    return {
      objectUrl,
      blob,
      width: outW,
      height: outH,
      sizeBytes: blob.size,
      format: settings.outputFormat,
      processingTimeSec: Number(((performance.now() - startedAt) / 1000).toFixed(2)),
      engineLabel: settings.engine === 'python-realesrgan'
        ? 'Python Real-ESRGAN + GFPGAN'
        : 'Sharp C++ Lanczos3 + CV',
    };
  }

  // Neural ESRGAN Browser Tiled Inference + Server Sharp Pre/Post-Processing
  onProgress({ percent: 6, stageLabel: 'Đang tiền xử lý khử nhiễu nén JPEG...' });

  const preFormData = new FormData();
  preFormData.append('image', image.file);
  preFormData.append('mode', 'preprocess');
  preFormData.append('denoise', String(settings.denoise));

  const preRes = await fetch('/api/enhance', {
    method: 'POST',
    body: preFormData,
    signal,
  });

  if (!preRes.ok) {
    const errData = await preRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Tiền xử lý ảnh thất bại.');
  }

  const preBlob = await preRes.blob();
  const preUrl = URL.createObjectURL(preBlob);

  // Guard max input dimension for browser WebGL/CPU neural inference to keep memory safe
  const imgEl = await loadImageElement(preUrl);
  let workingInput: HTMLImageElement | HTMLCanvasElement = imgEl;
  const maxNeuralInputDim = settings.scale === 4 ? 768 : 1280;

  if (Math.max(imgEl.naturalWidth, imgEl.naturalHeight) > maxNeuralInputDim) {
    // Downscale working copy slightly ONLY if exceeding browser tensor limits, or notify user
    const ratio = maxNeuralInputDim / Math.max(imgEl.naturalWidth, imgEl.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(imgEl.naturalWidth * ratio);
    canvas.height = Math.round(imgEl.naturalHeight * ratio);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
      workingInput = canvas;
    }
  }

  onProgress({ percent: 14, stageLabel: 'Đang khởi tạo mô hình mạng nơ-ron ESRGAN...' });

  // Ensure TensorFlow.js backend is ready (WebGL preferred, CPU fallback)
  try {
    await tf.ready();
  } catch {
    await tf.setBackend('cpu');
    await tf.ready();
  }

  const modelConfig = getLocalModelConfig(settings.engine, settings.scale);
  const upscaler = new Upscaler({ model: modelConfig as any });

  const abortHandler = () => {
    try {
      upscaler.abort();
    } catch {
      // ignore
    }
  };
  signal.addEventListener('abort', abortHandler, { once: true });

  let upscaledDataUrl = '';
  try {
    await upscaler.ready;
    onProgress({
      percent: 20,
      stageLabel: `Đang suy luận AI theo từng vùng (Tile ${settings.tileSize}×${settings.tileSize}px)...`,
    });

    upscaledDataUrl = await upscaler.execute(workingInput, {
      patchSize: settings.tileSize,
      padding: 4,
      output: 'base64',
      awaitNextFrame: true,
      signal,
      progress: (amount: number) => {
        const pct = Math.min(82, Math.round(20 + amount * 62));
        onProgress({
          percent: pct,
          stageLabel: `Đang phục hồi chi tiết bằng ESRGAN (${Math.round(amount * 100)}% tiles)...`,
        });
      },
    });
  } finally {
    signal.removeEventListener('abort', abortHandler);
    URL.revokeObjectURL(preUrl);
    await upscaler.dispose().catch(() => undefined);
    tf.engine().endScope?.();
  }

  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  onProgress({ percent: 86, stageLabel: 'Đang hậu xử lý tăng nét tự nhiên & khôi phục màu sắc...' });

  const neuralBlob = await dataUrlToBlob(upscaledDataUrl);
  const postFormData = new FormData();
  postFormData.append('image', new File([neuralBlob], 'esrgan_raw.png', { type: 'image/png' }));
  postFormData.append('mode', 'postprocess');
  postFormData.append('scale', String(settings.scale));
  postFormData.append('denoise', String(settings.denoise));
  postFormData.append('sharpen', String(settings.sharpen));
  postFormData.append('detailRecovery', String(settings.detailRecovery));
  postFormData.append('faceRestore', String(settings.faceRestore));
  postFormData.append('outputFormat', settings.outputFormat);

  const postRes = await fetch('/api/enhance', {
    method: 'POST',
    body: postFormData,
    signal,
  });

  if (!postRes.ok) {
    const errData = await postRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Hậu xử lý ảnh thất bại.');
  }

  const finalBlob = await postRes.blob();
  const finalObjectUrl = URL.createObjectURL(finalBlob);
  const outW = Number(postRes.headers.get('X-Output-Width')) || image.width * settings.scale;
  const outH = Number(postRes.headers.get('X-Output-Height')) || image.height * settings.scale;

  onProgress({ percent: 100, stageLabel: 'Hoàn tất phục hồi & nâng cấp độ phân giải.' });

  const backendType = tf.getBackend() === 'webgl' ? 'WebGL GPU' : 'CPU';
  const modelLabel = settings.engine === 'esrgan-slim' ? 'ESRGAN Slim' : 'ESRGAN Medium';

  return {
    objectUrl: finalObjectUrl,
    blob: finalBlob,
    width: outW,
    height: outH,
    sizeBytes: finalBlob.size,
    format: settings.outputFormat,
    processingTimeSec: Number(((performance.now() - startedAt) / 1000).toFixed(2)),
    engineLabel: `${modelLabel} (${backendType}) + Sharp CV`,
  };
}
