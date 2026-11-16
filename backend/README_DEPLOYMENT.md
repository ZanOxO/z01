# PixelEnhance AI — Hướng dẫn Triển khai Local & Cloud Chi phí Thấp

## 1. Chạy trên Máy tính Cá nhân (Local PC)
### Frontend + Node Gateway (Chạy ngay không cần GPU)
```bash
npm install
npm run dev
```
Truy cập `http://localhost:3000`. Chế độ **ESRGAN Neural (Browser WebGL/CPU)** và **Sharp C++ Super-Resolution** hoạt động hoàn toàn miễn phí ngay trên máy tính cá nhân.

### Kích hoạt Python AI Backend (Real-ESRGAN + GFPGAN + OpenCV)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Sau đó thiết lập biến môi trường `PYTHON_AI_BACKEND_URL=http://localhost:8000` (hoặc nhập trực tiếp trong bảng **Cài đặt** trên giao diện).

## 2. Triển khai Online Chi phí Thấp / Miễn phí
- **Frontend & Node Gateway**: Render Free Web Service, Railway ($5/tháng), hoặc Vercel/Cloud Run.
- **Python AI Backend**:
  - **Hugging Face Spaces (CPU Basic - Miễn phí 16GB RAM / 2 vCPU)**: Dùng `backend/Dockerfile`, giới hạn `tile_size=192`, `max_input_dim=1280`.
  - **Hugging Face Spaces ZeroGPU (Miễn phí GPU theo lượt)** hoặc **Modal / RunPod Serverless**: Chỉ tính tiền theo giây khi có ảnh gửi lên.

## 3. Giới hạn Phần cứng & Hosting
- Trên **CPU-only (2–4 GB RAM)**:
  - Ảnh đầu vào nên ≤ 1280px khi chạy 4x Real-ESRGAN (ảnh 1280px → 5120px cần ~300–500 MB buffer).
  - Bắt buộc bật **Tiled Processing** (`tile_size=128` hoặc `192`) để tránh lỗi Out-Of-Memory (OOM).
  - Thời gian xử lý 1 ảnh trên CPU: 8–35 giây tùy kích thước và mô hình (trên GPU RTX 3060 chỉ mất 0.8–2.5 giây).
