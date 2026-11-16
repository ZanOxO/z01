export type UpscaleScale = 2 | 4;

export type EngineMode = 'esrgan-medium' | 'esrgan-slim' | 'sharp-cv' | 'python-realesrgan';

export type OutputFormat = 'png' | 'jpg';

export type TileSizeOption = 64 | 128 | 256;

export interface EnhancementSettings {
  scale: UpscaleScale;
  engine: EngineMode;
  denoise: number;        // 0 to 1
  sharpen: number;        // 0 to 1
  detailRecovery: number; // 0 to 1
  faceRestore: boolean;
  tileSize: TileSizeOption;
  outputFormat: OutputFormat;
  pythonBackendUrl: string;
}

export interface ImageInfo {
  file: File;
  name: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  objectUrl: string;
}

export interface EnhancedResult {
  objectUrl: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  format: OutputFormat;
  processingTimeSec: number;
  engineLabel: string;
}

export interface ImageDiagnostic {
  source: string;
  summary: string;
  recommendedScale: UpscaleScale;
  recommendedDenoise: number;
  recommendedSharpen: number;
  recommendedDetailRecovery: number;
  recommendedFaceRestore: boolean;
  detectedIssues: string[];
  metrics: {
    width: number;
    height: number;
    entropy: number;
    stdev: number;
  };
}

export interface SystemCapabilities {
  status: string;
  runtime: string;
  cpus: number;
  totalMemMb: number;
  freeMemMb: number;
  geminiConfigured: boolean;
  pythonBackendUrl: string | null;
}
