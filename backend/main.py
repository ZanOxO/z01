"""
PixelEnhance AI - FastAPI Inference Microservice
Handles image validation, memory-safe processing, and automatic cleanup.
"""

import gc
import io
import os
import time
import logging

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from ai_engine import PixelEnhanceEngine, HAS_REALESRGAN, HAS_GFPGAN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pixelenhance.api")

MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB limit for low-RAM stability
MAX_INPUT_DIM = 2048               # Prevent excessive 4x output OOM on CPU
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

app = FastAPI(title="PixelEnhance AI Inference Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

engine = PixelEnhanceEngine(weights_dir=os.getenv("WEIGHTS_DIR", "./weights"))


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "device": str(engine.device),
        "realesrgan_available": HAS_REALESRGAN,
        "gfpgan_available": HAS_GFPGAN,
        "cuda_available": torch.cuda.is_available(),
    }


@app.post("/api/v1/upscale")
async def upscale_image(
    file: UploadFile = File(...),
    scale: int = Form(2),
    denoise: float = Form(0.35),
    sharpen: float = Form(0.35),
    face_restore: bool = Form(False),
    detail_recovery: float = Form(0.4),
    tile_size: int = Form(256),
    output_format: str = Form("png"),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported format. Allowed: JPG, JPEG, PNG, WEBP.")

    if scale not in (2, 4):
        raise HTTPException(status_code=400, detail="Scale must be 2 or 4.")

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 15 MB limit.")

    np_arr = np.frombuffer(raw_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    del raw_bytes, np_arr

    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Corrupted or unreadable image file.")

    h, w = img_bgr.shape[:2]
    if max(h, w) > MAX_INPUT_DIM:
        raise HTTPException(
            status_code=400,
            detail=f"Input resolution ({w}x{h}) exceeds {MAX_INPUT_DIM}px safety limit.",
        )

    start_ts = time.perf_counter()
    try:
        enhanced_bgr = engine.enhance(
            img_bgr=img_bgr,
            scale=scale,
            denoise=denoise,
            sharpen=sharpen,
            face_restore=face_restore,
            detail_recovery=detail_recovery,
            tile_size=tile_size,
        )

        fmt = output_format.lower()
        if fmt in ("jpg", "jpeg"):
            ok, encoded = cv2.imencode(".jpg", enhanced_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
            media_type = "image/jpeg"
        else:
            ok, encoded = cv2.imencode(".png", enhanced_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 6])
            media_type = "image/png"

        if not ok:
            raise RuntimeError("Failed to encode enhanced output image.")

        elapsed = round(time.perf_counter() - start_ts, 2)
        out_h, out_w = enhanced_bgr.shape[:2]
        buffer = io.BytesIO(encoded.tobytes())

        del img_bgr, enhanced_bgr, encoded
        gc.collect()

        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={
                "X-Output-Width": str(out_w),
                "X-Output-Height": str(out_h),
                "X-Processing-Time-Sec": str(elapsed),
                "X-Engine-Device": str(engine.device),
            },
        )
    except Exception as exc:
        logger.exception("Upscale failed")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {exc}")
