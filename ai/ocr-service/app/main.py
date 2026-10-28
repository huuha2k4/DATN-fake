# app/main.py
from contextlib import asynccontextmanager
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ocr_engine import OCREngine
from app.pipeline import ReceiptPipeline
from app.preprocess import fix_exif_rotation
from app.schemas import (
    CategoryResult, ClassifyBatchRequest,
    ClassifyRequest, ReceiptResult,
)

MAX_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png"}
state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- OCR ---
    engine = OCREngine()
    state["pipeline"] = ReceiptPipeline(engine, resize=True, contrast=True)
    print("✅ OCR model loaded.")

    # --- UserMemory ---
    from app.classify.memory import UserMemory
    memory = UserMemory()
    state["memory"] = memory
    print("✅ UserMemory initialized.")

    # --- Classify ---
    try:
        from app.classify.predictor import CategoryPredictor
        state["classifier"] = CategoryPredictor(memory=memory)
        print("✅ Classify model loaded.")
    except Exception as e:
        state["classifier"] = None
        print(f"[WARN] Classify model not loaded: {e}")

    yield
    state.clear()
    print("Service shutdown.")


app = FastAPI(
    title="Receipt OCR + Classify Service",
    version="2.1.0",
    description="Nhận ảnh hóa đơn → OCR → trích xuất → phân loại danh mục cá nhân hóa.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health():
    mem = state.get("memory")
    mem_stats = mem.stats() if mem else {}
    return {
        "status":   "ok",
        "ocr":      state.get("pipeline") is not None,
        "classify": state.get("classifier") is not None,
        "memory":   mem_stats,
    }


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

def _run_classify(text: str, raw_text: str = "",
                  user_id: Optional[str] = None) -> dict | None:
    clf = state.get("classifier")
    if not clf:
        return None
    try:
        return clf.predict(text, kind="expense",
                           raw_text=raw_text, user_id=user_id)
    except Exception:
        return None


@app.post("/ocr/receipt", response_model=ReceiptResult, tags=["OCR"],
          summary="Quét hóa đơn")
async def scan_receipt(
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ JPG hoặc PNG.")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Ảnh vượt quá 10MB.")
    img = fix_exif_rotation(data)
    if img is None:
        raise HTTPException(status_code=400, detail="Không đọc được file ảnh.")

    ocr_result = await run_in_threadpool(state["pipeline"].run, img)

    category_result = None
    if ocr_result.get("kind") != "draft":
        merchant = ocr_result.get("merchant_name") or ""
        raw_text = ocr_result.get("raw_text") or ""
        cat = await run_in_threadpool(
            _run_classify, merchant, raw_text, user_id
        )
        if cat:
            category_result = CategoryResult(**cat)

    return ReceiptResult(
        kind=ocr_result.get("kind", "unknown"),
        merchant_name=ocr_result.get("merchant_name"),
        transaction_date=ocr_result.get("transaction_date"),
        transaction_time=ocr_result.get("transaction_time"),
        total_amount=ocr_result.get("total_amount"),
        currency=ocr_result.get("currency", "VND"),
        raw_text=ocr_result.get("raw_text", ""),
        confidence=ocr_result.get("confidence", 0.0),
        needs_review=ocr_result.get("needs_review", False),
        category=category_result,
    )


# ---------------------------------------------------------------------------
# Classify
# ---------------------------------------------------------------------------

@app.post("/classify", response_model=CategoryResult, tags=["Classify"],
          summary="Phân loại danh mục giao dịch")
async def classify_transaction(body: ClassifyRequest):
    clf = state.get("classifier")
    if not clf:
        raise HTTPException(status_code=503, detail="Classify model chưa sẵn sàng.")
    result = await run_in_threadpool(
        clf.predict, body.text, body.kind, body.user_id
    )
    return CategoryResult(**result)


@app.post("/classify/batch", response_model=List[CategoryResult],
          tags=["Classify"], summary="Phân loại nhiều giao dịch")
async def classify_batch(body: ClassifyBatchRequest):
    clf = state.get("classifier")
    if not clf:
        raise HTTPException(status_code=503, detail="Classify model chưa sẵn sàng.")

    def _batch():
        return [clf.predict(i.text, i.kind, i.user_id) for i in body.items]

    results = await run_in_threadpool(_batch)
    return [CategoryResult(**r) for r in results]


# ---------------------------------------------------------------------------
# Feedback — cá nhân hóa
# ---------------------------------------------------------------------------

class FeedbackIn(BaseModel):
    user_id:  str = ""
    text:     str
    category: str


class FeedbackRuleOut(BaseModel):
    key:      str
    category: str
    count:    int


@app.post(
    "/classify/feedback",
    tags=["Classify"],
    summary="Ghi nhớ danh mục do người dùng sửa",
    description=(
        "Khi người dùng sửa danh mục gợi ý, gọi endpoint này để ghi nhớ. "
        "Lần sau với cùng merchant, danh mục sẽ luôn là danh mục người dùng đã chọn."
    ),
)
async def feedback(body: FeedbackIn):
    mem = state.get("memory")
    if not mem:
        raise HTTPException(status_code=503, detail="Memory chưa sẵn sàng.")

    from app.classify.normalize import normalize
    key = normalize(body.text)
    if not key:
        raise HTTPException(status_code=400, detail="text không hợp lệ.")

    await run_in_threadpool(mem.remember, body.user_id, key, body.category)
    return {
        "ok":       True,
        "user_id":  body.user_id,
        "key":      key,
        "category": body.category,
        "message":  f"Đã ghi nhớ: '{key}' → {body.category}",
    }


@app.get(
    "/classify/feedback/{user_id}",
    response_model=List[FeedbackRuleOut],
    tags=["Classify"],
    summary="Xem quy tắc cá nhân của người dùng",
)
async def get_feedback(user_id: str):
    mem = state.get("memory")
    if not mem:
        raise HTTPException(status_code=503, detail="Memory chưa sẵn sàng.")
    rules = await run_in_threadpool(mem.list_rules, user_id)
    return rules


@app.delete(
    "/classify/feedback/{user_id}/{key}",
    tags=["Classify"],
    summary="Xóa 1 quy tắc cá nhân",
)
async def delete_feedback(user_id: str, key: str):
    mem = state.get("memory")
    if not mem:
        raise HTTPException(status_code=503, detail="Memory chưa sẵn sàng.")
    await run_in_threadpool(mem.forget, user_id, key)
    return {"ok": True, "deleted": key}
