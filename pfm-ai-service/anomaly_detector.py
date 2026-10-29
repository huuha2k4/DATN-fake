import sys
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from database import SessionLocal, Transaction, Category

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def extract_features(transactions: List[Transaction], category_means: Dict[str, float]) -> np.ndarray:
    """
    Trích xuất vector đặc trưng đa chiều từ mỗi giao dịch:
    1. amount: Số tiền
    2. hour: Giờ giao dịch trong ngày (0 - 23)
    3. day_of_week: Thứ trong tuần (0 - 6)
    4. ratio_to_cat_mean: Tỷ lệ số tiền so với mức chi tiêu trung bình của danh mục đó
    5. is_night: Cờ đánh dấu giao dịch ban đêm (0h - 5h sáng)
    """
    features = []
    for t in transactions:
        hour = t.occurred_at.hour
        dow = t.occurred_at.weekday()
        cat_mean = category_means.get(t.category_id, 100000.0)
        ratio = t.amount / max(cat_mean, 1.0)
        is_night = 1.0 if (0 <= hour <= 5) else 0.0

        features.append([t.amount, float(hour), float(dow), ratio, is_night])
    return np.array(features)

class AnomalyDetector:
    def __init__(self, contamination: float = 0.03):
        self.contamination = contamination
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.category_means: Dict[str, float] = {}
        self.is_fitted = False

    def fit_user(self, user_id: str = "test_user_01"):
        """
        Huấn luyện mô hình Isolation Forest trên lịch sử giao dịch của người dùng.
        """
        db = SessionLocal()
        try:
            txs = (
                db.query(Transaction)
                .filter(Transaction.user_id == user_id, Transaction.type == "EXPENSE")
                .all()
            )
            if len(txs) < 10:
                return False

            # Tính trung bình chi tiêu theo từng danh mục
            cat_totals: Dict[str, List[float]] = {}
            for t in txs:
                if t.category_id not in cat_totals:
                    cat_totals[t.category_id] = []
                cat_totals[t.category_id].append(t.amount)
            
            self.category_means = {
                cat_id: float(np.mean(amounts)) for cat_id, amounts in cat_totals.items()
            }

            X = extract_features(txs, self.category_means)
            self.model.fit(X)
            self.is_fitted = True
            return True
        finally:
            db.close()

    def inspect_transaction(
        self,
        amount: float,
        category_id: Optional[str] = None,
        occurred_at: Optional[datetime] = None,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Đánh giá một giao dịch cụ thể xem có bất thường hay không.
        """
        if not self.is_fitted:
            self.fit_user()

        dt = occurred_at or datetime.now()
        hour = dt.hour
        dow = dt.weekday()
        cat_mean = self.category_means.get(category_id, 100000.0)
        ratio = amount / max(cat_mean, 1.0)
        is_night = 1.0 if (0 <= hour <= 5) else 0.0

        x = np.array([[amount, float(hour), float(dow), ratio, is_night]])

        # isolation forest decision_function: càng âm thì càng bất thường
        score = float(self.model.decision_function(x)[0])
        pred = int(self.model.predict(x)[0]) # -1: bất thường, 1: bình thường

        is_anomaly = (pred == -1)

        # Phân tích nguyên nhân và mức độ nghiêm trọng
        reasons = []
        severity = "LOW"

        if ratio >= 4.0:
            reasons.append(f"Số tiền {amount:,.0f} VND cao gấp {ratio:.1f} lần mức trung bình danh mục ({cat_mean:,.0f} VND)")
            severity = "HIGH" if ratio < 8.0 else "CRITICAL"
        elif ratio >= 2.5:
            reasons.append(f"Số tiền {amount:,.0f} VND cao hơn đáng kể so với mức chi tiêu thường ngày ({cat_mean:,.0f} VND)")
            severity = "MEDIUM"

        if is_night == 1.0:
            reasons.append(f"Giao dịch phát sinh vào khung giờ khuya bất thường ({hour:02d}:{dt.minute:02d})")
            if severity in ("MEDIUM", "HIGH"):
                severity = "CRITICAL"
            else:
                severity = "HIGH"

        if not is_anomaly and not reasons:
            explanation = "Giao dịch bình thường, phù hợp với thói quen chi tiêu hàng ngày."
        else:
            explanation = "Cảnh báo bất thường: " + " & ".join(reasons) if reasons else "Giao dịch có dấu hiệu bất thường so với phân bố lịch sử."

        return {
            "is_anomaly": is_anomaly or (len(reasons) > 0),
            "severity": severity if is_anomaly else "NORMAL",
            "anomaly_score": round(score, 4),
            "amount": amount,
            "category_mean": round(cat_mean, 0),
            "ratio_to_mean": round(ratio, 2),
            "explanation": explanation
        }

    def scan_historical_anomalies(self, user_id: str = "test_user_01") -> List[Dict[str, Any]]:
        """
        Quét toàn bộ lịch sử chi tiêu của người dùng để tìm các giao dịch bị mô hình đánh dấu bất thường.
        """
        self.fit_user(user_id)
        db = SessionLocal()
        try:
            txs = (
                db.query(Transaction)
                .filter(Transaction.user_id == user_id, Transaction.type == "EXPENSE")
                .order_by(Transaction.occurred_at.desc())
                .all()
            )

            anomalies = []
            for t in txs:
                res = self.inspect_transaction(
                    amount=t.amount,
                    category_id=t.category_id,
                    occurred_at=t.occurred_at,
                    note=t.note
                )
                if res["is_anomaly"] and res["severity"] in ("MEDIUM", "HIGH", "CRITICAL"):
                    cat_name = t.category.name if t.category else "Chung"
                    anomalies.append({
                        "transaction_id": t.id,
                        "date": t.occurred_at.strftime("%d/%m/%Y %H:%M"),
                        "amount": t.amount,
                        "category": cat_name,
                        "note": t.note,
                        "severity": res["severity"],
                        "explanation": res["explanation"]
                    })
            return anomalies
        finally:
            db.close()

# Khởi tạo singleton detector
detector = AnomalyDetector(contamination=0.03)

if __name__ == "__main__":
    detector.fit_user("test_user_01")
    print("=== TEST PHÁT HIỆN BẤT THƯỜNG ===")
    
    # Test 1: Bữa ăn bình thường (50k lúc 12h)
    normal_tx = detector.inspect_transaction(
        amount=50000.0,
        category_id="cat_food",
        occurred_at=datetime(2026, 10, 12, 12, 30)
    )
    print("\n1. Giao dịch ăn trưa 50.000 VND:")
    print(" -> Bất thường?", normal_tx["is_anomaly"], "| Mức độ:", normal_tx["severity"])
    print(" -> Giải thích:", normal_tx["explanation"])

    # Test 2: Bữa ăn đột biến 2.500.000 VND
    huge_tx = detector.inspect_transaction(
        amount=2500000.0,
        category_id="cat_food",
        occurred_at=datetime(2026, 10, 12, 19, 0)
    )
    print("\n2. Giao dịch ăn uống 2.500.000 VND:")
    print(" -> Bất thường?", huge_tx["is_anomaly"], "| Mức độ:", huge_tx["severity"])
    print(" -> Giải thích:", huge_tx["explanation"])

    # Test 3: Giao dịch lúc 2h sáng
    night_tx = detector.inspect_transaction(
        amount=800000.0,
        category_id="cat_shop",
        occurred_at=datetime(2026, 10, 12, 2, 15)
    )
    print("\n3. Giao dịch lúc 02:15 sáng (800.000 VND):")
    print(" -> Bất thường?", night_tx["is_anomaly"], "| Mức độ:", night_tx["severity"])
    print(" -> Giải thích:", night_tx["explanation"])
