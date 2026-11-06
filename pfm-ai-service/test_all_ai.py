import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv

load_dotenv()

USER_ID = "b5f7482d-74a0-4582-8fa2-9c586211a583"

print("==================================================")
print("1. TEST AI 2: BEHAVIOR PROFILER & PERSONA")
print("==================================================")
from behavior_profiler import profiler
profile = profiler.analyze_user(USER_ID)
print("Status:", profile.get("status"))
print("Persona:", profile.get("persona", {}).get("title"), "-", profile.get("persona", {}).get("tagline"))
print("Summary:", profile.get("summary"))
print("50/30/20 Rule:", profile.get("rule_50_30_20"))
print("Radar Scores:", profile.get("radar_scores"))
print("Top Categories:", len(profile.get("top_categories", [])))
print("Findings:", profile.get("findings"))

print("\n==================================================")
print("2. TEST AI 3: BALANCE FORECAST (PROPHET)")
print("==================================================")
from forecaster import forecast_balance, forecast_category_spending
fc_bal = forecast_balance(USER_ID, horizon_days=30)
print("Status:", fc_bal.get("status"))
print("Algorithm:", fc_bal.get("algorithm"))
print("Current Balance:", f"{fc_bal.get('current_balance', 0):,.0f} VND")
print("Projected EOM:", f"{fc_bal.get('projected_end_of_month_balance', 0):,.0f} VND")
print("Historical Points:", len(fc_bal.get("historical_points", [])))
print("Forecast Points:", len(fc_bal.get("forecast_points", [])))
print("Summary:", fc_bal.get("summary"))

print("\n==================================================")
print("3. TEST AI 3: CATEGORY FORECAST (Ăn uống)")
print("==================================================")
fc_cat = forecast_category_spending(user_id=USER_ID, category_name="Ăn uống")
print("Status:", fc_cat.get("status"))
print("Current Spent:", f"{fc_cat.get('current_spent', 0):,.0f} VND")
print("Projected Month:", f"{fc_cat.get('projected_total_month', 0):,.0f} VND")
print("Budget Limit:", fc_cat.get("budget_limit"))
print("Risk Level:", fc_cat.get("risk_level"))
print("Summary:", fc_cat.get("summary"))

print("\n==================================================")
print("4. TEST AI 4: ANOMALY DETECTION (ISOLATION FOREST)")
print("==================================================")
from anomaly_detector import detector
anomalies = detector.scan_historical_anomalies(USER_ID)
print(f"Historical Anomalies found: {len(anomalies)}")
for a in anomalies:
    print(f" - [{a['severity']}] {a['date']} | {a['amount']:,.0f} VND | {a['category']} | {a['note']}")
    print(f"   Lý do: {a['explanation']}")

# Test realtime check
check_res = detector.inspect_transaction(amount=4500000.0, category_id="ef86f943-77d1-4a42-b6bb-1ccc8d97ec6a")
print("\nRealtime Check (4.5M Ăn uống):", check_res["is_anomaly"], check_res["severity"], check_res["explanation"])

print("\n==================================================")
print("5. TEST AI 5: FINANCIAL RECOMMENDATIONS")
print("==================================================")
from recommender import recommender
recs = recommender.generate_recommendations(USER_ID)
print("Health Score:", recs.get("health_score"), recs.get("health_rating"))
print("Total Monthly Potential Savings:", f"{recs.get('total_monthly_potential_savings', 0):,.0f} VND")
print("Overall Advice:", recs.get("overall_advice"))
print(f"Recommendations count: {len(recs.get('recommendations', []))}")
for r in recs.get("recommendations", []):
    print(f" - [{r.get('priority')}] {r.get('title')}: {r.get('summary')}")

print("\n==================================================")
print("6. TEST AI 1: AGENT CHAT ('số dư của tôi còn bao nhiêu')")
print("==================================================")
from agent import run_chat
chat_reply = run_chat("số dư của tôi còn bao nhiêu", USER_ID)
print("AI Chat Answer:")
print(chat_reply)
print("==================================================")
