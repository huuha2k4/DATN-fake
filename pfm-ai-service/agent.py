import os
from datetime import datetime
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from tools import ALL_TOOLS

load_dotenv()

def get_system_prompt() -> str:
    now = datetime.now()
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year = now.year if now.month > 1 else now.year - 1
    return f"""Bạn là Trợ lý tài chính cá nhân thông minh (PFM AI Assistant).
Nhiệm vụ của bạn là hỗ trợ người dùng quản lý tài chính, giải đáp các thắc mắc về chi tiêu, ngân sách, số dư tài khoản, tìm kiếm giao dịch chi tiết và đưa ra lời khuyên tài chính hữu ích.

NGUYÊN TẮC HOẠT ĐỘNG:
1. Khi người dùng hỏi về dữ liệu tài chính của họ (số dư, đã tiêu bao nhiêu, ngân sách còn lại, giao dịch gần đây, tìm kiếm giao dịch cụ thể, so sánh các tháng), bạn BẮT BUỘC phải gọi các Tool thích hợp để lấy số liệu thực tế. TUYỆT ĐỐI KHÔNG tự bịa ra số tiền.
2. Mốc thời gian tham chiếu hiện tại: Ngày hôm nay là {now.strftime('%d/%m/%Y')} (Tháng {now.month} năm {now.year}).
   - "Tháng này" = Tháng {now.month}/{now.year} (month={now.month}, year={now.year}).
   - "Tháng trước" = Tháng {prev_month}/{prev_year} (month={prev_month}, year={prev_year}).
   - "Gần đây" = Dùng tool get_recent_transactions.
   - Khi cần lọc theo số tiền (ví dụ trên 500k), tìm từ khóa (ví dụ Grab, Highlands), hoặc lọc ngày: Dùng tool search_transactions.
   - Khi cần so sánh chi tiêu giữa hai tháng: Dùng tool compare_monthly_spending.
   - Khi người dùng hỏi về tương lai (ví dụ: 'cuối tháng còn bao nhiêu tiền?', 'dự báo số dư', 'có bị thâm hụt không?'): Dùng tool get_balance_forecast.
   - Khi người dùng hỏi về giao dịch bất thường, chi tiêu đáng ngờ, cảnh báo: Dùng tool check_unusual_spending.
   - Khi người dùng hỏi về thói quen chi tiêu, phong cách tài chính (Persona), tỷ lệ tiết kiệm, quy tắc 50/30/20: Dùng tool get_spending_behavior_profile.
   - Khi người dùng hỏi: 'Tôi nên cắt giảm khoản chi nào?', 'Cho tôi lời khuyên tài chính', 'Làm sao để tiết kiệm nhiều hơn?', 'Gợi ý kế hoạch tài chính': Dùng tool get_financial_recommendations.
3. Khi trả lời, hãy trình bày số tiền rõ ràng (ví dụ: 3.500.000 VND), có cấu trúc dễ đọc, thân thiện và động viên người dùng tiết kiệm.
4. Với các câu hỏi lý thuyết tài chính (ví dụ: "quy tắc 50/30/20 là gì?", "quỹ khẩn cấp là gì?"), hãy giải thích ngắn gọn, súc tích và dễ hiểu.
"""

def get_agent():
    use_local = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"
    
    if use_local:
        from langchain_ollama import ChatOllama
        local_model = os.getenv("LOCAL_MODEL_NAME", "qwen2.5:1.5b")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        llm = ChatOllama(
            model=local_model,
            base_url=base_url,
            temperature=0.2
        )
    else:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or "YOUR_GEMINI_API_KEY" in api_key:
            return None

        llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash",
            temperature=0.2,
            google_api_key=api_key
        )

    agent_executor = create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        prompt=get_system_prompt()
    )
    return agent_executor

def run_chat(question: str, user_id: str = "test_user_01") -> str:
    agent = get_agent()
    if agent is None:
        return (
            "Chưa cấu hình GEMINI_API_KEY hợp lệ! Vui lòng mở file .env và điền "
            "Gemini API Key của bạn (lấy miễn phí tại https://aistudio.google.com/)."
        )

    # Đưa câu hỏi vào agent
    # Bổ sung ngữ cảnh user_id vào câu hỏi để tool bắt đúng user
    input_message = f"[User ID: {user_id}] {question}"
    
    try:
        response = agent.invoke({
            "messages": [("user", input_message)]
        })
        # Lấy tin nhắn cuối cùng của assistant
        last_message = response["messages"][-1]
        content = last_message.content
        if isinstance(content, list):
            text_parts = [item.get("text", "") if isinstance(item, dict) else str(item) for item in content]
            return "".join(text_parts)
        return str(content)
    except Exception as e:
        return f"Lỗi trong quá trình xử lý AI: {str(e)}"
