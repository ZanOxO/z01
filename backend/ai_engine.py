"""
PixelEnhance AI - Resource-Optimized Open-Source AI Super-Resolution Engine
Supports Real-ESRGAN (RRDBNet), optional GFPGAN Face Restoration, and OpenCV Pre/Post-Processing.
Designed for both CUDA GPUs and CPU-only low-RAM deployments via automatic tiled inference.
"""

import gc
import os
import logging
from typing import Optional, Dict, Any

import cv2
import numpy as np
import torch

logger = logging.getLogger("pixelenhance.ai")

# Optional model imports with graceful degradation when weights/packages are absent
try:
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
    HAS_REALESRGAN = True
except ImportError:
    HAS_REALESRGAN = False
    logger.warning("Real-ESRGAN not installed; falling back to OpenCV Bicubic/Lanczos+Detail pipeline.")

try:
    from gfpgan import GFPGANer
    HAS_GFPGAN = True
except ImportError:
    HAS_GFPGAN = False
    logger.info("GFPGAN not installed; Face Restoration will use OpenCV edge-preserving skin refinement.")


class PixelEnhanceEngine:
    def __init__(self, weights_dir: str = "./weights"):
        self.weights_dir = weights_dir
        os.makedirs(self.weights_dir, exist_ok=True)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.use_half = self.device.type == "cuda"
        self._upsamplers: Dict[int, Any] = {}
        self._face_enhancer: Optional[Any] = None

    def _get_tile_size(self, width: int, height: int, requested_tile: int) -> int:
        """Select memory-safe tile size based on available hardware."""
        if requested_tile > 0:
            return requested_tile
        if self.device.type == "cpu":
            # Keep RAM footprint minimal on CPU-only servers (2-4 GB RAM)
            return 192 if max(width, height) > 800 else 256
        return 400

    def _load_realesrgan(self, scale: int, tile_size: int):
        if not HAS_REALESRGAN:
            return None

        # Use RealESRGAN_x4plus for both 4x and 2x (outscale parameter handles 2x cleanly)
        model = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=4,
        )
        model_path = os.path.join(self.weights_dir, "RealESRGAN_x4plus.pth")
        model_url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"

        upsampler = RealESRGANer(
            scale=4,
            model_path=model_path if os.path.exists(model_path) else model_url,
            model=model,
            tile=tile_size,
            tile_pad=10,
            pre_pad=0,
            half=self.use_half,
            device=self.device,
        )
        return upsampler

    def _load_gfpgan(self, upsampler):
        if not HAS_GFPGAN:
            return None
        model_path = os.path.join(self.weights_dir, "GFPGANv1.4.pth")
        model_url = "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth"
        return GFPGANer(
            model_path=model_path if os.path.exists(model_path) else model_url,
            upscale=2,
            arch="clean",
            channel_multiplier=2,
            bg_upsampler=upsampler,
            device=self.device,
        )

    @staticmethod
    def preprocess_opencv(img_bgr: np.ndarray, denoise_strength: float) -> np.ndarray:
        """Remove compression noise before super-resolution so artifacts are not magnified."""
        if denoise_strength <= 0:
            return img_bgr
        h_luma = max(2.0, min(10.0, denoise_strength * 8.0))
        h_color = max(2.0, min(10.0, denoise_strength * 8.0))
        return cv2.fastNlMeansDenoisingColored(img_bgr, None, h_luma, h_color, 7, 21)

    @staticmethod
    def postprocess_opencv(
        img_bgr: np.ndarray,
        sharpen_strength: float,
        detail_recovery: float,
        face_smoothing: bool = False,
    ) -> np.ndarray:
        """
        Natural post-processing:
        - Detail Recovery: Gentle CLAHE on Luminance channel (L in LAB) to preserve natural colors.
        - Sharpen: Controlled Unsharp Mask avoiding halo artifacts.
        """
        result = img_bgr

        if detail_recovery > 0:
            lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clip_limit = 1.0 + (detail_recovery * 1.2)
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l_ch)
            # Blend enhanced luminance softly to keep tonal transitions natural
            alpha = min(0.55, detail_recovery * 0.5)
            l_blended = cv2.addWeighted(l_ch, 1.0 - alpha, l_enhanced, alpha, 0)
            result = cv2.cvtColor(cv2.merge((l_blended, a_ch, b_ch)), cv2.COLOR_LAB2BGR)

        if face_smoothing:
            # Mild bilateral filter preserves edges while smoothing micro-compression artifacts
            smooth = cv2.bilateralFilter(result, d=5, sigmaColor=28, sigmaSpace=28)
            result = cv2.addWeighted(result, 0.72, smooth, 0.28, 0)

        if sharpen_strength > 0:
            gaussian = cv2.GaussianBlur(result, (0, 0), sigmaX=1.1)
            amount = min(0.65, sharpen_strength * 0.55)
            result = cv2.addWeighted(result, 1.0 + amount, gaussian, -amount, 0)

        return np.clip(result, 0, 255).astype(np.uint8)

    def enhance(
        self,
        img_bgr: np.ndarray,
        scale: int = 2,
        denoise: float = 0.35,
        sharpen: float = 0.35,
        face_restore: bool = False,
        detail_recovery: float = 0.4,
        tile_size: int = 0,
    ) -> np.ndarray:
        h, w = img_bgr.shape[:2]
        effective_tile = self._get_tile_size(w, h, tile_size)

        # Stage 1: OpenCV pre-denoising
        cleaned = self.preprocess_opencv(img_bgr, denoise)

        # Stage 2: Neural Super-Resolution (Real-ESRGAN + optional GFPGAN)
        upscaled = None
        upsampler = self._load_realesrgan(scale, effective_tile)

        try:
            if upsampler is not None:
                if face_restore and HAS_GFPGAN:
                    face_enhancer = self._load_gfpgan(upsampler)
                    if face_enhancer is not None:
                        _, _, upscaled = face_enhancer.enhance(
                            cleaned,
                            has_aligned=False,
                            only_center_face=False,
                            paste_back=True,
                        )
                        if scale == 4:
                            target_w, target_h = w * 4, h * 4
                            if upscaled.shape[1] != target_w or upscaled.shape[0] != target_h:
                                upscaled = cv2.resize(upscaled, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
                        del face_enhancer
                if upscaled is None:
                    upscaled, _ = upsampler.enhance(cleaned, outscale=scale)
            else:
                # Lightweight CPU fallback when PyTorch weights are not installed
                target_w, target_h = w * scale, h * scale
                upscaled = cv2.resize(cleaned, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

            # Stage 3: Natural OpenCV Post-Processing
            final_img = self.postprocess_opencv(
                upscaled,
                sharpen_strength=sharpen,
                detail_recovery=detail_recovery,
                face_smoothing=face_restore and not HAS_GFPGAN,
            )
            return final_img
        finally:
            # Explicit memory cleanup to keep RAM/VRAM low on constrained hosts
            if upsampler is not None:
                del upsampler
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
