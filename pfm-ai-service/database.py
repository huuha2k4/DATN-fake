import os
from datetime import datetime, date
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, String, Float, DateTime, Date, ForeignKey, Boolean, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/finance_db")

is_postgres = "postgres" in DATABASE_URL
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif is_postgres:
    connect_args = {"options": "-c search_path=core,public"}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    email = Column(String, nullable=False)
    full_name = Column(String, nullable=True)

def resolve_user_id(user_id=None, db=None) -> str:
    """Tự động kiểm tra và chuyển user_id thành UUID hợp lệ của PostgreSQL"""
    if user_id:
        try:
            import uuid
            uuid.UUID(str(user_id))
            return str(user_id)
        except (ValueError, TypeError, AttributeError):
            pass
    
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        first_user = db.query(User).first()
        if first_user:
            return str(first_user.id)
    except Exception:
        pass
    finally:
        if close_db:
            db.close()
    return "b5f7482d-74a0-4582-8fa2-9c586211a583"

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    kind = Column(String(20), nullable=False, default="EXPENSE") # EXPENSE, INCOME
    is_essential = Column(Boolean, default=False)

    transactions = relationship("Transaction", back_populates="category")

class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    account_type = Column("account_type", String(20), nullable=True)
    balance = Column("balance", Float, nullable=False, default=0.0)
    currency_code = Column(String(3), default="VND")

    @property
    def current_balance(self):
        return float(self.balance) if self.balance is not None else 0.0

    @property
    def type(self):
        return self.account_type or "OTHER"

    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    account_id = Column(String, ForeignKey("core.accounts.id" if is_postgres else "accounts.id"), nullable=False)
    category_id = Column(String, ForeignKey("core.categories.id" if is_postgres else "categories.id"), nullable=True)
    type = Column(String(30), nullable=False) # EXPENSE, INCOME, TRANSFER
    amount = Column(Float, nullable=False)
    currency_code = Column(String(3), default="VND")
    exchange_rate = Column(Float, default=1.0)
    base_amount = Column(Float, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    occurred_date = Column(Date, nullable=True)
    note = Column(Text, nullable=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.base_amount is None and self.amount is not None:
            self.base_amount = self.amount
        if self.exchange_rate is None:
            self.exchange_rate = 1.0
        if self.occurred_date is None and self.occurred_at is not None:
            if hasattr(self.occurred_at, 'date'):
                self.occurred_date = self.occurred_at.date()

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_amount = Column("total_amount", Float, nullable=False, default=0.0)

    @property
    def total_limit(self):
        return float(self.total_amount) if self.total_amount is not None else 0.0

    items = relationship("BudgetItem", back_populates="budget", cascade="all, delete-orphan")

class BudgetItem(Base):
    __tablename__ = "budget_items"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    budget_id = Column(String, ForeignKey("core.budgets.id" if is_postgres else "budgets.id"), nullable=False)
    category_id = Column(String, ForeignKey("core.categories.id" if is_postgres else "categories.id"), nullable=False)
    amount = Column("amount", Float, nullable=False, default=0.0)
    spent_amount = Column("spent_amount", Float, default=0.0)

    @property
    def limit_amount(self):
        return float(self.amount) if self.amount is not None else 0.0

    budget = relationship("Budget", back_populates="items")
    category = relationship("Category")

class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = {"schema": "core"} if is_postgres else {}
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0.0)
    target_date = Column(Date, nullable=True)
    status = Column(String(20), default="ACTIVE")

def init_db():
    if "sqlite" in DATABASE_URL:
        Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
