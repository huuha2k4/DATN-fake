# demo/streamlit_app.py
import os
import requests
import streamlit as st

API_URL = os.getenv("OCR_API_URL", "http://localhost:8003/ocr/receipt").strip()

# Emoji theo danh mục
CATEGORY_EMOJI = {
    "food":          "🍜",
    "transport":     "🚗",
    "shopping":      "🛍️",
    "bills":         "💡",
    "housing":       "🏠",
    "entertainment": "🎬",
    "health":        "💊",
    "education":     "📚",
    "travel":        "✈️",
    "transfer":      "💸",
    "other":         "📦",
    "salary":        "💼",
    "bonus":         "🎁",
    "family":        "👨‍👩‍👧",
    "other_income":  "💰",
}

st.set_page_config(page_title="Demo Quét Hóa Đơn", page_icon="🧾", layout="centered")
st.title("🧾 Demo Quét Hóa Đơn")
st.caption("Upload ảnh hóa đơn — OCR tự động đọc thông tin và phân loại danh mục.")

uploaded = st.file_uploader(
    "Chọn ảnh hóa đơn",
    type=["jpg", "jpeg", "png"],
    help="Hỗ trợ JPG và PNG, tối đa 10MB.",
)

if uploaded:
    col1, col2 = st.columns([1, 1])
    with col1:
        st.image(uploaded, caption="Ảnh đầu vào", use_column_width=True)

    with col2:
        with st.spinner("Đang xử lý OCR..."):
            try:
                resp = requests.post(
                    API_URL,
                    files={"file": (uploaded.name, uploaded.getvalue(), uploaded.type)},
                    timeout=60,
                )
            except requests.exceptions.ConnectionError:
                st.error(f"❌ Không kết nối được tới OCR service tại {API_URL}")
                st.stop()

        if not resp.ok:
            st.error(f"❌ Lỗi từ server: {resp.status_code} — {resp.text}")
            st.stop()

        r = resp.json()
        kind        = r.get("kind", "unknown")
        confidence  = r.get("confidence", 0)
        needs_review = r.get("needs_review", False)

        # ── Phiếu tạm tính ──────────────────────────────────────────
        if kind == "draft":
            st.warning("⚠️ **Đây là phiếu tạm tính** — chưa thanh toán, không thể tạo giao dịch.")
            with st.expander("📄 Văn bản OCR thô"):
                st.text(r.get("raw_text", ""))
            st.stop()

        # ── Hóa đơn đã thanh toán ───────────────────────────────────
        if needs_review or confidence < 0.7:
            st.warning(f"⚠️ Độ tin cậy thấp ({confidence:.0%}) — vui lòng kiểm tra lại.")
        else:
            st.success(f"✅ Độ tin cậy OCR: {confidence:.0%}")

        st.markdown("### Kết quả trích xuất")

        merchant = r.get("merchant_name") or "—"
        date_val = r.get("transaction_date") or "—"
        time_val = r.get("transaction_time") or ""
        total    = r.get("total_amount")

        st.write(f"**🏪 Cửa hàng:** {merchant}")
        st.write(f"**📅 Ngày:** {date_val}  {time_val}")
        if total is not None:
            st.write(f"**💰 Tổng tiền:** {total:,} đ")
        else:
            st.write("**💰 Tổng tiền:** —")

        # ── Danh mục giao dịch ──────────────────────────────────────
        cat = r.get("category")
        if cat:
            emoji     = CATEGORY_EMOJI.get(cat["category"], "📦")
            cat_name  = cat.get("category_name", cat["category"])
            cat_conf  = cat.get("confidence", 0)
            cat_src   = cat.get("source", "")
            cat_status = cat.get("status", "ask")

            st.markdown("---")
            st.markdown("### 🏷️ Phân loại danh mục")

            col_cat, col_conf = st.columns([2, 1])
            with col_cat:
                if cat_status == "auto":
                    st.success(f"{emoji} **{cat_name}**")
                elif cat_status == "suggest":
                    st.info(f"{emoji} **{cat_name}** *(gợi ý)*")
                else:
                    st.warning(f"❓ Chưa xác định được danh mục")

            with col_conf:
                st.metric("Độ tin cậy", f"{cat_conf:.0%}")

            # Source badge
            src_label = {"dictionary": "📖 Từ điển", "model": "🤖 ML Model", "fallback": "⚠️ Fallback"}
            st.caption(src_label.get(cat_src, cat_src))

            # Top 3 nếu có
            top3 = cat.get("top3", [])
            if top3 and cat_status != "auto":
                with st.expander("Xem top 3 gợi ý"):
                    for item in top3:
                        em = CATEGORY_EMOJI.get(item["category"], "📦")
                        st.write(f"{em} {item['category']} — {item['p']:.0%}")
        else:
            st.info("ℹ️ Không phân loại được danh mục.")

        # ── Chi tiết ────────────────────────────────────────────────
        st.markdown("---")
        with st.expander("📄 Văn bản OCR thô"):
            st.text(r.get("raw_text", ""))

        with st.expander("📋 JSON đầy đủ"):
            st.json(r)

# ── Hướng dẫn ───────────────────────────────────────────────────────────────
with st.expander("ℹ️ Hướng dẫn chạy service"):
    st.code(
        "cd e:/Desktop/DATN/DATN/ai/ocr-service\n"
        "venv\\Scripts\\uvicorn.exe app.main:app --host 0.0.0.0 --port 8003",
        language="bash",
    )
    st.markdown(
        "Chạy demo:\n"
        "```bash\n"
        "set OCR_API_URL=http://localhost:8003/ocr/receipt\n"
        "venv\\Scripts\\streamlit.exe run demo/streamlit_app.py\n"
        "```"
    )
