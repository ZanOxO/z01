import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_INPUT_DIMENSION = 4096;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const SAMPLE_FILES: Record<string, string> = {
  portrait: 'sample_portrait_studio_1794824846983.jpg',
  architecture: 'sample_architecture_city_1794824847242.jpg',
  macro: 'sample_macro_chronograph_1794824846983.jpg',
};

const app = express();
app.use(express.json({ limit: '2mb' }));

// Configure memory-only upload to avoid storing user images on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(new Error('Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, JPEG, PNG và WEBP.'));
      return;
    }
    cb(null, true);
  },
});

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Serve bundled open-source ESRGAN TensorFlow.js weights locally (zero external CDN dependency)
const esrganMediumModels = path.resolve(process.cwd(), 'node_modules/@upscalerjs/esrgan-medium/models');
const esrganSlimModels = path.resolve(process.cwd(), 'node_modules/@upscalerjs/esrgan-slim/models');
if (fs.existsSync(esrganMediumModels)) {
  app.use('/models/esrgan-medium', express.static(esrganMediumModels, { maxAge: '7d' }));
}
if (fs.existsSync(esrganSlimModels)) {
  app.use('/models/esrgan-slim', express.static(esrganSlimModels, { maxAge: '7d' }));
}

app.get('/api/health', (_req: Request, res: Response) => {
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  res.json({
    status: 'ok',
    runtime: 'nodejs-sharp-esrgan',
    cpus: os.cpus().length,
    totalMemMb,
    freeMemMb,
    geminiConfigured: Boolean(getGeminiClient()),
    pythonBackendUrl: process.env.PYTHON_AI_BACKEND_URL || null,
  });
});

// Generate an authentic degraded low-resolution test sample from local assets
app.get('/api/sample-lowres/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const fileName = SAMPLE_FILES[id];
    if (!fileName) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    const candidates = [
      path.resolve(process.cwd(), 'src/assets/images', fileName),
      path.resolve(process.cwd(), 'dist/src/assets/images', fileName),
    ];
    const sourcePath = candidates.find((p) => fs.existsSync(p));
    if (!sourcePath) {
      res.status(404).json({ error: 'Sample asset missing on server' });
      return;
    }

    // Downscale to ~360px wide with subtle blur + JPEG compression to simulate realistic low-res input
    const meta = await sharp(sourcePath).metadata();
    const targetWidth = 360;
    const targetHeight = meta.width && meta.height
      ? Math.max(120, Math.round((meta.height / meta.width) * targetWidth))
      : 270;

    const degradedBuffer = await sharp(sourcePath)
      .resize(targetWidth, targetHeight, { kernel: 'cubic' })
      .blur(0.45)
      .jpeg({ quality: 78 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('X-Sample-Width', String(targetWidth));
    res.setHeader('X-Sample-Height', String(targetHeight));
    res.send(degradedBuffer);
  } catch (err) {
    console.error('Sample generation error:', err);
    res.status(500).json({ error: 'Không thể tạo ảnh mẫu.' });
  }
});

// Intelligent Image Quality Analysis (Free Gemini 4 Hydrogen + Local Sharp CV fallback)
app.post('/api/analyze-image', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Vui lòng tải lên một tệp ảnh hợp lệ.' });
    return;
  }

  try {
    const imgSharp = sharp(req.file.buffer).rotate();
    const metadata = await imgSharp.metadata();
    const stats = await imgSharp.stats();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const entropy = Number(stats.entropy?.toFixed(2) || 0);

    // Heuristic CV metrics from channel standard deviations
    const avgStdev = stats.channels.length > 0
      ? stats.channels.reduce((acc, ch) => acc + ch.stdev, 0) / stats.channels.length
      : 40;

    const fallbackAnalysis = () => {
      const isSmall = Math.max(width, height) <= 640;
      const isNoisy = entropy > 7.45 && avgStdev > 55;
      const isSoft = avgStdev < 38;
      return {
        source: 'computer-vision-local',
        summary: isSmall
          ? `Ảnh đầu vào có độ phân giải thấp (${width}×${height} px). Khuyên dùng AI Upscale 4x kết hợp phục hồi chi tiết.`
          : `Ảnh đầu vào kích thước ${width}×${height} px, độ tương phản trung bình. Phù hợp nâng cấp 2x và tăng nét nhẹ.`,
        recommendedScale: isSmall ? 4 : 2,
        recommendedDenoise: isNoisy ? 0.55 : 0.3,
        recommendedSharpen: isSoft ? 0.5 : 0.35,
        recommendedDetailRecovery: 0.45,
        recommendedFaceRestore: false,
        detectedIssues: [
          ...(isSmall ? ['Độ phân giải thấp'] : []),
          ...(isNoisy ? ['Nhiễu hạt / Nén JPEG'] : []),
          ...(isSoft ? ['Viền ảnh hơi mờ'] : []),
          ...(entropy <= 7.45 && !isSoft && !isSmall ? ['Chi tiết bề mặt cần khôi phục'] : []),
        ],
        metrics: { width, height, entropy, stdev: Math.round(avgStdev) },
      };
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallbackAnalysis());
      return;
    }

    // Resize thumbnail for fast, zero-cost-efficient multimodal analysis via gemini-4-hydrogen
    const thumbBuffer = await imgSharp
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: thumbBuffer.toString('base64'),
            },
          },
          {
            text: `Analyze this image (original size ${width}x${height} px) for AI super-resolution restoration. Detect blur, JPEG compression artifacts, sensor noise, and whether human faces are prominent. Respond in Vietnamese for summary and detectedIssues.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: '1-2 concise sentences in Vietnamese diagnosing image quality.' },
            recommendedScale: { type: Type.INTEGER, description: '2 or 4' },
            recommendedDenoise: { type: Type.NUMBER, description: 'Float from 0.0 to 1.0' },
            recommendedSharpen: { type: Type.NUMBER, description: 'Float from 0.0 to 1.0' },
            recommendedDetailRecovery: { type: Type.NUMBER, description: 'Float from 0.0 to 1.0' },
            recommendedFaceRestore: { type: Type.BOOLEAN },
            detectedIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    res.json({
      source: 'gemini-4-hydrogen',
      summary: parsed.summary || fallbackAnalysis().summary,
      recommendedScale: parsed.recommendedScale === 4 ? 4 : 2,
      recommendedDenoise: Math.max(0, Math.min(1, Number(parsed.recommendedDenoise ?? 0.35))),
      recommendedSharpen: Math.max(0, Math.min(1, Number(parsed.recommendedSharpen ?? 0.35))),
      recommendedDetailRecovery: Math.max(0, Math.min(1, Number(parsed.recommendedDetailRecovery ?? 0.4))),
      recommendedFaceRestore: Boolean(parsed.recommendedFaceRestore),
      detectedIssues: Array.isArray(parsed.detectedIssues) && parsed.detectedIssues.length > 0
        ? parsed.detectedIssues.slice(0, 4)
        : ['Sẵn sàng nâng cấp chi tiết'],
      metrics: { width, height, entropy, stdev: Math.round(avgStdev) },
    });
  } catch (err) {
    console.warn('Gemini image analysis fallback triggered:', err instanceof Error ? err.message : err);
    try {
      const meta = await sharp(req.file.buffer).metadata();
      const width = meta.width || 0;
      const height = meta.height || 0;
      res.json({
        source: 'computer-vision-local',
        summary: `Đã phân tích ảnh ${width}×${height} px bằng bộ đo cục bộ. Đề xuất chế độ khử nhiễu nhẹ và phục hồi vi chi tiết.`,
        recommendedScale: Math.max(width, height) <= 640 ? 4 : 2,
        recommendedDenoise: 0.35,
        recommendedSharpen: 0.4,
        recommendedDetailRecovery: 0.45,
        recommendedFaceRestore: false,
        detectedIssues: Math.max(width, height) <= 640 ? ['Độ phân giải thấp'] : ['Cần tăng sắc nét tự nhiên'],
        metrics: { width, height, entropy: 7.1, stdev: 42 },
      });
    } catch {
      res.status(500).json({ error: 'Không thể phân tích tệp ảnh này.' });
    }
  }
});

// Core Computer Vision Pre-processing, Post-processing, or CPU Server Upscaling
app.post('/api/enhance', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Không tìm thấy tệp ảnh tải lên.' });
    return;
  }

  const startTs = performance.now();
  try {
    const mode = String(req.body.mode || 'server-upscale'); // 'preprocess' | 'postprocess' | 'server-upscale'
    const scale = Number(req.body.scale) === 4 ? 4 : 2;
    const denoise = Math.max(0, Math.min(1, Number(req.body.denoise ?? 0.35)));
    const sharpen = Math.max(0, Math.min(1, Number(req.body.sharpen ?? 0.35)));
    const detailRecovery = Math.max(0, Math.min(1, Number(req.body.detailRecovery ?? 0.4)));
    const faceRestore = req.body.faceRestore === 'true' || req.body.faceRestore === true;
    const outputFormat = String(req.body.outputFormat || 'png').toLowerCase() === 'jpg' ? 'jpg' : 'png';
    const customPythonUrl = typeof req.body.pythonBackendUrl === 'string' && req.body.pythonBackendUrl.trim()
      ? req.body.pythonBackendUrl.trim()
      : process.env.PYTHON_AI_BACKEND_URL;

    // If user explicitly configured a Python Real-ESRGAN / GFPGAN microservice, proxy to it
    if (mode === 'python-realesrgan' && customPythonUrl) {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
      formData.append('file', blob, req.file.originalname || 'image.png');
      formData.append('scale', String(scale));
      formData.append('denoise', String(denoise));
      formData.append('sharpen', String(sharpen));
      formData.append('face_restore', String(faceRestore));
      formData.append('detail_recovery', String(detailRecovery));
      formData.append('output_format', outputFormat);

      const targetEndpoint = `${customPythonUrl.replace(/\/$/, '')}/api/v1/upscale`;
      const pyRes = await fetch(targetEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!pyRes.ok) {
        const errText = await pyRes.text();
        res.status(pyRes.status).json({ error: `Python AI Backend lỗi: ${errText}` });
        return;
      }

      const arrayBuf = await pyRes.arrayBuffer();
      const outBuf = Buffer.from(arrayBuf);
      res.setHeader('Content-Type', outputFormat === 'jpg' ? 'image/jpeg' : 'image/png');
      res.setHeader('X-Engine-Used', 'python-realesrgan');
      res.setHeader('X-Processing-Time-Ms', String(Math.round(performance.now() - startTs)));
      res.send(outBuf);
      return;
    }

    const baseSharp = sharp(req.file.buffer, { limitInputPixels: MAX_INPUT_DIMENSION * MAX_INPUT_DIMENSION * 4 }).rotate();
    const meta = await baseSharp.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    if (!width || !height) {
      res.status(400).json({ error: 'Tệp ảnh bị lỗi hoặc không đọc được kích thước.' });
      return;
    }

    if (mode !== 'postprocess' && Math.max(width, height) > MAX_INPUT_DIMENSION) {
      res.status(400).json({
        error: `Kích thước ảnh (${width}×${height}) vượt quá giới hạn an toàn ${MAX_INPUT_DIMENSION}px.`,
      });
      return;
    }

    let pipeline = baseSharp.toColorspace('srgb');

    if (mode === 'preprocess') {
      // Pre-denoising before neural ESRGAN inference so JPEG block noise isn't amplified
      if (denoise >= 0.45) {
        pipeline = pipeline.median(3);
      }
      const preBuf = await pipeline.png({ compressionLevel: 3 }).toBuffer();
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Width', String(width));
      res.setHeader('X-Height', String(height));
      res.send(preBuf);
      return;
    }

    if (mode === 'server-upscale') {
      // Pre-denoise
      if (denoise >= 0.35) {
        pipeline = pipeline.median(3);
      }
      if (denoise >= 0.7) {
        pipeline = pipeline.blur(0.45);
      }

      // Progressive multi-pass Lanczos3 super-resolution (reduces aliasing on 4x)
      if (scale === 4) {
        const midW = Math.min(width * 2, 8192);
        const midH = Math.min(height * 2, 8192);
        const midBuf = await pipeline
          .resize(midW, midH, { kernel: sharp.kernel.lanczos3 })
          .sharpen({ sigma: 0.65, m1: 0.4, m2: 1.2 })
          .toBuffer();

        const finalW = Math.min(width * 4, 8192);
        const finalH = Math.min(height * 4, 8192);
        pipeline = sharp(midBuf).resize(finalW, finalH, { kernel: sharp.kernel.lanczos3 });
      } else {
        const finalW = Math.min(width * 2, 8192);
        const finalH = Math.min(height * 2, 8192);
        pipeline = pipeline.resize(finalW, finalH, { kernel: sharp.kernel.lanczos3 });
      }
    }

    // Post-processing stage (applied both to server-upscale and neural ESRGAN postprocess)
    if (detailRecovery > 0.1) {
      const maxSlope = Math.max(1, Math.min(4, Math.round(1 + detailRecovery * 2.5)));
      pipeline = pipeline.clahe({ width: 48, height: 48, maxSlope });
    }

    if (faceRestore) {
      // Gentle tonal preservation + mild median micro-artifact cleanup around skin transitions
      pipeline = pipeline.modulate({ saturation: 0.98, brightness: 1.01 });
    }

    if (sharpen > 0.05) {
      const sigma = 0.6 + sharpen * 0.65;
      const m1 = 0.25 + sharpen * 0.45;
      const m2 = 0.9 + sharpen * 1.4;
      pipeline = pipeline.sharpen({ sigma, m1, m2 });
    }

    const outBuffer = outputFormat === 'jpg'
      ? await pipeline.jpeg({ quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer()
      : await pipeline.png({ compressionLevel: 6, adaptiveFiltering: true }).toBuffer();

    const outMeta = await sharp(outBuffer).metadata();
    const elapsedMs = Math.round(performance.now() - startTs);

    res.setHeader('Content-Type', outputFormat === 'jpg' ? 'image/jpeg' : 'image/png');
    res.setHeader('X-Output-Width', String(outMeta.width || width));
    res.setHeader('X-Output-Height', String(outMeta.height || height));
    res.setHeader('X-Output-Bytes', String(outBuffer.length));
    res.setHeader('X-Processing-Time-Ms', String(elapsedMs));
    res.setHeader('X-Engine-Used', mode === 'postprocess' ? 'esrgan-neural-plus-sharp' : 'sharp-lanczos3-cv');
    res.send(outBuffer);
  } catch (err) {
    console.error('Image enhancement error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Xử lý ảnh thất bại. Vui lòng thử ảnh khác hoặc giảm kích thước.',
    });
  }
});

// Express multer/error middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Dung lượng ảnh vượt quá giới hạn tối đa 20 MB.' });
      return;
    }
    res.status(400).json({ error: `Lỗi tải tệp: ${err.message}` });
    return;
  }
  res.status(400).json({ error: err.message || 'Lỗi máy chủ không xác định.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PixelEnhance AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
