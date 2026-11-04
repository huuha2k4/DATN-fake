import sys
from database import SessionLocal, Category, Account, Transaction, Budget, BudgetItem, Goal

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def view():
    db = SessionLocal()
    print("=" * 60)
    print("1. DANH SÁCH TÀI KHOẢN (ACCOUNTS):")
    for acc in db.query(Account).all():
        print(f" - [{acc.id}] {acc.name} ({acc.type}): {acc.current_balance:,.0f} {acc.currency_code}")

    print("\n" + "=" * 60)
    print("2. DANH MỤC THU / CHI (CATEGORIES):")
    for cat in db.query(Category).all():
        print(f" - [{cat.id}] {cat.name} ({cat.kind}) | Thiết yếu: {cat.is_essential}")

    print("\n" + "=" * 60)
    print("3. CÁC GIAO DỊCH GẦN NHẤT (TRANSACTIONS):")
    for tx in db.query(Transaction).order_by(Transaction.occurred_at.desc()).limit(10).all():
        cat_name = tx.category.name if tx.category else "Chưa phân loại"
        sign = "+" if tx.type == "INCOME" else "-"
        print(f" - [{tx.occurred_at.strftime('%d/%m/%Y')}] {sign}{tx.amount:,.0f} VND | {cat_name} | Ghi chú: {tx.note}")

    print("\n" + "=" * 60)
    print("4. NGÂN SÁCH (BUDGETS):")
    for b in db.query(Budget).all():
        print(f" - {b.name} (Hạn mức: {b.total_limit:,.0f} VND):")
        for item in b.items:
            cname = item.category.name if item.category else "Chung"
            print(f"    * {cname}: Đã chi {item.spent_amount:,.0f} / {item.limit_amount:,.0f} VND")

    print("\n" + "=" * 60)
    print("5. MỤC TIÊU TÀI CHÍNH (GOALS):")
    for g in db.query(Goal).all():
        pct = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
        t_date = g.target_date.strftime('%d/%m/%Y') if g.target_date else "Không có"
        print(f" - [{g.id}] {g.name}: {g.current_amount:,.0f} / {g.target_amount:,.0f} VND ({pct:.1f}%) | Hạn: {t_date} | Trạng thái: {g.status}")

    print("=" * 60)
    db.close()

if __name__ == "__main__":
    view()
