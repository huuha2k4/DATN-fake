"""
AI 5: Gợi ý và tư vấn tài chính cá nhân hóa (Personalized Financial Recommendations)
Module tổng hợp dữ liệu từ AI 2 (Hồ sơ hành vi), AI 3 (Dự báo tương lai),
ngân sách và mục tiêu để sinh ra các khuyến nghị tài chính hành động được (Actionable Recommendations),
có tính toán con số cụ thể và bám sát đề cương đồ án tốt nghiệp.
"""

import sys
import os
import json
import re
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import func
from database import SessionLocal, Transaction, Account, Category, Budget, BudgetItem, Goal
from behavior_profiler import profiler

load_dotenv()

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def get_llm():
    """
    Khởi tạo LLM: Ưu tiên Gemini API, hỗ trợ chuyển sang Local Ollama chỉ bằng biến môi trường.
    """
    use_local = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"
    if use_local:
        try:
            from langchain_ollama import ChatOllama
            local_model = os.getenv("LOCAL_MODEL_NAME", "qwen2.5:1.5b")
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            return ChatOllama(model=local_model, base_url=base_url, temperature=0.3)
        except Exception:
            return None
    else:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or "YOUR_GEMINI_API_KEY" in api_key:
            return None
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-3.5-flash",
                temperature=0.3,
                google_api_key=api_key
            )
        except Exception:
            return None

class FinancialRecommender:
    """
    Hệ thống gợi ý và tư vấn tài chính cá nhân hóa.
    Kết hợp giữa Động cơ quy tắc tài chính chính xác (Rules) và Mô hình ngôn ngữ lớn (LLM).
    """


    def generate_recommendations(self, user_id: str = "test_user_01") -> Dict[str, Any]:
        db = SessionLocal()
        try:
            # 1. Thu thập dữ liệu từ AI 2 (Hồ sơ hành vi)
            behavior_data = profiler.analyze_user(user_id=user_id)
            if behavior_data.get("status") != "SUCCESS":
                return {
                    "status": "COLD_START",
                    "message": "Chưa đủ dữ liệu để sinh khuyến nghị cá nhân hóa.",
                    "recommendations": []
                }

            persona = behavior_data.get("persona", {})
            summary = behavior_data.get("summary", {})
            rule_50_30_20 = behavior_data.get("rule_50_30_20", {})
            dining = behavior_data.get("dining_analysis", {})
            temporal = behavior_data.get("temporal_patterns", {})
            top_cats = behavior_data.get("top_categories", [])

            # 2. Thu thập dữ liệu tài sản & tài khoản hiện tại
            accounts = db.query(Account).filter(Account.user_id == user_id).all()
            total_liquid_balance = sum(a.current_balance for a in accounts)

            # 3. Thu thập dữ liệu mục tiêu tài chính (Goals)
            goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "ACTIVE").all()
            emergency_goal = next((g for g in goals if "dự phòng" in g.name.lower() or "khẩn cấp" in g.name.lower()), None)
            large_purchase_goals = [g for g in goals if g != emergency_goal]

            # 4. Thu thập dữ liệu ngân sách hiện tại (Budgets)
            current_month = datetime.now().month
            current_year = datetime.now().year
            budget = (
                db.query(Budget)
                .filter(Budget.user_id == user_id)
                .order_by(Budget.start_date.desc())
                .first()
            )
            budget_items = budget.items if budget else []

            # Tính mức chi tiêu trung bình tháng
            monthly_income = summary.get("total_income", 15000000.0) / max(1, len(top_cats)) if summary.get("total_income", 0) > 0 else 15000000.0
            # Giả định ước lượng chi tiêu 1 tháng thông thường
            monthly_expense = float(summary.get("total_expense", 10000000.0)) / 3.0 # Lịch sử 3 tháng gần nhất
            if monthly_expense <= 0:
                monthly_expense = 8000000.0

            recommendations = []
            health_score_components = []

            # ==============================================================
            # KHUYẾN NGHỊ 1: GIẢM CHI TIÊU ĂN UỐNG 15% (Đúng đề cương đồ án)
            # ==============================================================
            dining_pct = dining.get("dining_percentage", 0.0)
            dining_amount = dining.get("dining_amount", 0.0)
            # Chi tiêu ăn uống trung bình 1 tháng
            monthly_dining = dining_amount / 3.0 if dining_amount > 0 else 5000000.0
            cut_rate = 0.15
            monthly_savings_from_cut = round(monthly_dining * cut_rate)
            annual_savings = monthly_savings_from_cut * 12

            if dining_pct >= 28.0:
                recommendations.append({
                    "id": "REC_FOOD_CUT_15",
                    "title": "Cắt giảm chi tiêu ăn uống khoảng 15%",
                    "category": "Ăn uống",
                    "type": "EXPENSE_REDUCTION",
                    "priority": "HIGH" if dining_pct >= 35.0 else "MEDIUM",
                    "icon": "🥗",
                    "badge_color": "#f59e0b",
                    "impact_monthly_vnd": monthly_savings_from_cut,
                    "summary": f"Tiết kiệm thêm {monthly_savings_from_cut:,.0f} VND/tháng bằng cách tối ưu hóa tiền ăn ngoài và cà phê.",
                    "explanation": f"Hiện tại khoản chi cho ăn uống đang chiếm {dining_pct}% tổng chi tiêu của bạn. Việc giảm nhẹ 15% chi phí này sẽ giữ lại được {annual_savings:,.0f} VND mỗi năm mà không làm giảm đáng kể chất lượng cuộc sống.",
                    "action_steps": [
                        "Chuẩn bị bữa trưa mang đi làm/đi học 2-3 buổi trong tuần thay vì ăn ngoài.",
                        "Hạn chế đặt đồ ăn qua các ứng dụng giao hàng vào các ngày trong tuần (giảm phí ship và phụ phí).",
                        "Đặt hạn mức chi tiêu ăn uống ngoài giờ tối đa 50.000 VND/ngày."
                    ]
                })
                health_score_components.append(15)
            else:
                health_score_components.append(25)

            # ==============================================================
            # KHUYẾN NGHỊ 2: TĂNG MỨC TIẾT KIỆM HÀNG THÁNG (Đúng đề cương đồ án)
            # ==============================================================
            savings_rate = summary.get("savings_rate", 0.0)
            target_savings_rate = 20.0 # Chuẩn 50/30/20

            if savings_rate < target_savings_rate:
                needed_savings_monthly = round(monthly_expense * 0.25)
                recommendations.append({
                    "id": "REC_BOOST_SAVINGS",
                    "title": "Tăng tỷ lệ tiết kiệm hàng tháng lên tối thiểu 20%",
                    "category": "Tích lũy",
                    "type": "SAVINGS_BOOST",
                    "priority": "HIGH",
                    "icon": "💰",
                    "badge_color": "#10b981",
                    "impact_monthly_vnd": needed_savings_monthly,
                    "summary": f"Tỷ lệ tiết kiệm hiện tại ({savings_rate}%) chưa đạt chuẩn an toàn 20% theo quy tắc 50/30/20.",
                    "explanation": f"Để xây dựng nền tảng tài chính vững chắc, bạn nên nâng mức tiết kiệm từ {savings_rate}% lên ít nhất 20% thu nhập hàng tháng.",
                    "action_steps": [
                        "Áp dụng nguyên tắc 'Trả cho bản thân trước' (Pay Yourself First): Trích ngay 20% lương vào tài khoản tích lũy ngay khi nhận lương đầu tháng.",
                        "Tự động chuyển tiền định kỳ sang tài khoản tiết kiệm linh hoạt có kỳ hạn."
                    ]
                })
                health_score_components.append(10)
            else:
                # Nếu tỷ lệ tiết kiệm đã tốt, gợi ý tối ưu hóa dòng tiền nhàn rỗi
                recommendations.append({
                    "id": "REC_OPTIMIZE_SAVINGS",
                    "title": "Tối ưu hóa lợi nhuận từ số tiền tích lũy nhàn rỗi",
                    "category": "Đầu tư",
                    "type": "SAVINGS_BOOST",
                    "priority": "LOW",
                    "icon": "📈",
                    "badge_color": "#10b981",
                    "impact_monthly_vnd": round(total_liquid_balance * 0.05 / 12),
                    "summary": f"Tỷ lệ tích lũy của bạn rất tốt ({savings_rate}%). Hãy chuyển bớt tiền nhàn rỗi sang tài khoản sinh lời.",
                    "explanation": f"Số dư tài khoản vãng lai của bạn hiện đạt {total_liquid_balance:,.0f} VND. Để tiền trong tài khoản thanh toán chỉ hưởng lãi suất 0.1%/năm. Chuyển vào kênh sinh lời 4-5%/năm sẽ đem lại thêm thu nhập thụ động.",
                    "action_steps": [
                        "Duy trì trong tài khoản thanh toán số tiền đủ chi tiêu 1 tháng.",
                        "Số tiền còn lại gửi vào chứng chỉ tiền gửi hoặc tài khoản tiết kiệm online để sinh lời 4-6%/năm."
                    ]
                })
                health_score_components.append(30)

            # ==============================================================
            # KHUYẾN NGHỊ 3: XÂY DỰNG QUỸ DỰ PHÒNG KHẨN CẤP (Đúng đề cương đồ án)
            # ==============================================================
            # Chuẩn quỹ khẩn cấp: 3 đến 6 tháng chi tiêu
            recommended_emergency_fund = round(monthly_expense * 3)
            current_emergency_amount = emergency_goal.current_amount if emergency_goal else total_liquid_balance
            emergency_target = emergency_goal.target_amount if emergency_goal else recommended_emergency_fund

            if current_emergency_amount < emergency_target:
                shortfall = emergency_target - current_emergency_amount
                recommendations.append({
                    "id": "REC_EMERGENCY_FUND",
                    "title": "Nên ưu tiên hoàn thành quỹ dự phòng khẩn cấp trước khi đầu tư",
                    "category": "Dự phòng",
                    "type": "EMERGENCY_FUND",
                    "priority": "HIGH",
                    "icon": "🛡️",
                    "badge_color": "#38bdf8",
                    "impact_monthly_vnd": round(shortfall / 6),
                    "summary": f"Quỹ dự phòng hiện đạt {current_emergency_amount:,.0f} VND / {emergency_target:,.0f} VND (còn thiếu {shortfall:,.0f} VND).",
                    "explanation": "Quỹ khẩn cấp tương đương 3-6 tháng sinh hoạt phí là tấm lá chắn bảo vệ bạn trước các rủi ro sức khỏe, xe cộ hoặc thu nhập gián đoạn. Bạn nên ưu tiên lấp đầy quỹ này trước khi mua sắm các đồ công nghệ lớn hoặc đầu tư mạo hiểm.",
                    "action_steps": [
                        f"Dành tối thiểu 50% tiền tiết kiệm mỗi tháng (khoảng {round(shortfall/6):,.0f} VND) vào mục tiêu Quỹ dự phòng.",
                        "Tạm hoãn các kế hoạch mua sắm chưa thực sự cấp bách cho đến khi quỹ dự phòng đạt ít nhất 3 tháng chi tiêu.",
                        "Lưu trữ quỹ dự phòng ở nơi có tính thanh khoản cao (ví điện tử có sinh lời hoặc gửi ngân hàng rút gốc linh hoạt)."
                    ]
                })
                health_score_components.append(15)
            else:
                health_score_components.append(25)

            # ==============================================================
            # KHUYẾN NGHỊ 4: ĐIỀU CHỈNH NGÂN SÁCH CHO PHÙ HỢP (Đúng đề cương đồ án)
            # ==============================================================
            overspent_items = []
            for item in budget_items:
                spent_pct = (item.spent_amount / item.limit_amount * 100.0) if item.limit_amount > 0 else 0
                cat_name = item.category.name if item.category else item.category_id
                if spent_pct >= 75.0:
                    overspent_items.append({
                        "category": cat_name,
                        "limit": item.limit_amount,
                        "spent": item.spent_amount,
                        "pct": round(spent_pct, 1)
                    })

            if overspent_items:
                top_over = overspent_items[0]
                recommendations.append({
                    "id": "REC_ADJUST_BUDGET",
                    "title": f"Điều chỉnh hạn mức ngân sách danh mục {top_over['category']}",
                    "category": top_over['category'],
                    "type": "BUDGET_ADJUSTMENT",
                    "priority": "HIGH",
                    "icon": "📊",
                    "badge_color": "#ec4899",
                    "impact_monthly_vnd": round(top_over["limit"] * 0.2),
                    "summary": f"Danh mục {top_over['category']} đã sử dụng hết {top_over['pct']}% hạn mức ngân sách.",
                    "explanation": f"Hạn mức hiện tại của danh mục {top_over['category']} đang bị căng thẳng ({top_over['spent']:,.0f}/{top_over['limit']:,.0f} VND). Bạn cần điều chỉnh hành vi tiêu dùng ngay hoặc tái phân bổ ngân sách từ các danh mục còn dư thừa.",
                    "action_steps": [
                        f"Tạm dừng các khoản chi mới cho {top_over['category']} trong thời gian còn lại của chu kỳ ngân sách.",
                        f"Chuyển bớt 300.000 - 500.000 VND từ danh mục chưa tiêu hết sang {top_over['category']} để không bị vỡ kế hoạch chung.",
                        "Xem xét nâng hạn mức danh mục này trong tháng sau nếu đây là nhu cầu thực sự cần thiết."
                    ]
                })
                health_score_components.append(10)
            else:
                health_score_components.append(20)

            # ==============================================================
            # KHUYẾN NGHỊ 5: KIỂM SOÁT THÓI QUEN THỜI GIAN (Cuối tuần / Cuối tháng)
            # ==============================================================
            has_eom_spike = temporal.get("has_eom_spike", False)
            weekend_pct = temporal.get("weekend_percentage", 0.0)

            if has_eom_spike:
                recommendations.append({
                    "id": "REC_CONTROL_EOM_SPENDING",
                    "title": "Kiểm soát tâm lý chi tiêu đột biến vào cuối tháng",
                    "category": "Thói quen",
                    "type": "HABIT_CONTROL",
                    "priority": "MEDIUM",
                    "icon": "📅",
                    "badge_color": "#8b5cf6",
                    "impact_monthly_vnd": round(monthly_expense * 0.1),
                    "summary": "Chi tiêu có xu hướng tăng đột biến vào 7 ngày cuối tháng.",
                    "explanation": "Dữ liệu cho thấy bạn thường có tâm lý thoải mái 'vung tay' vào giai đoạn cuối tháng khi thấy tài khoản vẫn còn tiền, làm giảm số dư tích lũy chuyển sang tháng sau.",
                    "action_steps": [
                        "Chia nhỏ ngân sách theo từng tuần (Weekly Budget) thay vì quản lý theo cả tháng.",
                        "Đặt quy tắc 24h: Trước khi mua một món đồ không thiết yếu vào cuối tháng, hãy chờ 24 giờ để cân nhắc."
                    ]
                })

            # 5. Tính điểm sức khỏe tài chính tổng hợp (0 - 100)
            total_health_score = min(100, max(20, sum(health_score_components)))
            if total_health_score >= 80:
                health_rating = "Tài chính Rất Tốt 🌟"
                health_badge_color = "#10b981"
            elif total_health_score >= 65:
                health_rating = "Tài chính Khá Tốt 👍"
                health_badge_color = "#38bdf8"
            elif total_health_score >= 50:
                health_rating = "Tài chính Trung Bình ⚠️"
                health_badge_color = "#f59e0b"
            else:
                health_rating = "Cần Cải Thiện Khẩn Cấp 🚨"
                health_badge_color = "#ef4444"

            # 6. Đoạn văn tổng hợp lời khuyên từ Cố vấn AI (Template cơ sở)
            persona_title = persona.get("title", "Người dùng PFM")
            baseline_overall_advice = (
                f"Dựa trên hồ sơ hành vi '{persona_title}' và xu hướng chi tiêu thực tế, "
                f"điểm sức khỏe tài chính của bạn đạt {total_health_score}/100 ({health_rating}). "
                f"Hành động quan trọng nhất hiện nay là tập trung cắt giảm ~15% chi phí ăn uống ngoài hàng "
                f"(tiết kiệm thêm ~{monthly_savings_from_cut:,.0f} VND/tháng) và dồn số tiền này hoàn thiện "
                f"Quỹ dự phòng khẩn cấp trước khi giải ngân cho các mục tiêu mua sắm lớn."
            )

            # 7. Nâng cấp lời khuyên bằng LLM (Gemini/Local) để văn phong tự nhiên, sắc sảo, cá nhân hóa
            overall_advice, recommendations = self._enhance_with_llm(
                persona=persona,
                summary=summary,
                dining=dining,
                rule_50=rule_50_30_20,
                recommendations=recommendations,
                baseline_overall_advice=baseline_overall_advice
            )

            return {
                "status": "SUCCESS",
                "user_id": user_id,
                "health_score": total_health_score,
                "health_rating": health_rating,
                "health_badge_color": health_badge_color,
                "overall_advice": overall_advice,
                "total_monthly_potential_savings": monthly_savings_from_cut,
                "recommendations_count": len(recommendations),
                "recommendations": recommendations
            }

        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e),
                "message": f"Lỗi khi sinh khuyến nghị tài chính: {str(e)}",
                "recommendations": []
            }
        finally:
            db.close()

    def _enhance_with_llm(
        self,
        persona: Dict[str, Any],
        summary: Dict[str, Any],
        dining: Dict[str, Any],
        rule_50: Dict[str, Any],
        recommendations: List[Dict[str, Any]],
        baseline_overall_advice: str
    ) -> tuple:
        """
        Sử dụng LLM (Gemini hoặc Local Qwen) để viết lại lời khuyên tự nhiên, sâu sắc
        và đề xuất các mẹo hành động thực tế dựa trên bệnh án tài chính của người dùng.
        Luôn có cơ chế Fallback về template nếu LLM không khả dụng hoặc lỗi mạng.
        """
        llm = get_llm()
        if not llm:
            return baseline_overall_advice, recommendations

        try:
            recs_summary = [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "category": r["category"],
                    "impact_vnd": r["impact_monthly_vnd"],
                    "current_summary": r["summary"]
                }
                for r in recommendations
            ]

            prompt = f"""Bạn là Chuyên gia Tư vấn Tài chính Cá nhân Cao cấp (PFM Senior Financial Advisor).
Dưới đây là chẩn đoán số liệu tài chính thực tế trích xuất từ database của người dùng:
- Hình mẫu tài chính: {persona.get('title', 'Người dùng')} - {persona.get('tagline', '')}
- Tỷ lệ tiết kiệm thực tế: {summary.get('savings_rate', 0)}% ({summary.get('savings_label', '')})
- Phân bổ 50/30/20: Thiết yếu {rule_50.get('needs_pct', 0)}% | Hưởng thụ {rule_50.get('wants_pct', 0)}% | Tích lũy {rule_50.get('savings_pct', 0)}%
- Chi tiêu ăn uống: chiếm {dining.get('dining_percentage', 0)}% tổng ngân sách ({dining.get('dining_amount', 0):,.0f} VND)
- Danh sách các khuyến nghị cốt lõi cần tối ưu:
{json.dumps(recs_summary, ensure_ascii=False, indent=2)}

NHIỆM VỤ:
Hãy đóng vai trò là một cố vấn tài chính am hiểu tâm lý, viết lại lời khuyên cho người dùng thật tự nhiên, sắc sảo, truyền động lực và mang đậm dấu ấn cá nhân hóa (không dùng văn phong dập khuôn máy móc).

YÊU CẦU ĐẦU RA (BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU, KHÔNG VIẾT CHỮ NGOÀI JSON):
{{
  "overall_advice": "Đoạn văn 2-3 câu nhận xét sắc sảo về phong cách chi tiêu của người này, chỉ ra điểm mấu chốt cần hành động ngay để tối ưu tài chính.",
  "recommendations": [
    {{
      "id": "id tương ứng trong danh sách trên",
      "explanation": "Đoạn văn 1-2 câu giải thích sinh động, thuyết phục vì sao người này cần làm việc đó dựa trên số liệu thực tế.",
      "action_steps": [
        "Hành động thực tế, cụ thể 1 (gắn liền với thói quen sinh hoạt)",
        "Hành động thực tế, cụ thể 2",
        "Hành động thực tế, cụ thể 3"
      ]
    }}
  ]
}}"""

            response = llm.invoke(prompt)
            raw_content = response.content if hasattr(response, "content") else str(response)
            if isinstance(raw_content, list):
                content = "".join([item.get("text", "") if isinstance(item, dict) else str(item) for item in raw_content])
            else:
                content = str(raw_content)

            # Làm sạch định dạng markdown json nếu LLM bọc trong ```json
            cleaned = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)

            # Trích xuất khối JSON chính xác phòng trường hợp LLM sinh text ngoài JSON
            json_match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
            if json_match:
                cleaned = json_match.group(0)

            data = json.loads(cleaned)
            new_overall = data.get("overall_advice", baseline_overall_advice)
            enhanced_recs_map = {item["id"]: item for item in data.get("recommendations", []) if "id" in item}

            for r in recommendations:
                if r["id"] in enhanced_recs_map:
                    enh = enhanced_recs_map[r["id"]]
                    if enh.get("explanation"):
                        r["explanation"] = enh["explanation"]
                    if enh.get("action_steps") and isinstance(enh["action_steps"], list):
                        r["action_steps"] = enh["action_steps"]

            return new_overall, recommendations
        except Exception as err:
            # Fallback an toàn về template nếu LLM quá tải hoặc lỗi parse
            print(f"[AI 5 Recommender] LLM enhancement fallback: {err}")
            return baseline_overall_advice, recommendations


# Singleton instance
recommender = FinancialRecommender()

if __name__ == "__main__":
    import json
    res = recommender.generate_recommendations("test_user_01")
    print(json.dumps(res, ensure_ascii=False, indent=2))
