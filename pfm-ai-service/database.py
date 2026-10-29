import os
from datetime import datetime, date
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, String, Float, DateTime, Date, ForeignKey, Boolean, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pfm.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    kind = Column(String(20), nullable=False, default="EXPENSE") # EXPENSE, INCOME
    is_essential = Column(Boolean, default=False)

    transactions = relationship("Transaction", back_populates="category")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False) # CASH, BANK, E_WALLET
    current_balance = Column(Float, nullable=False, default=0.0)
    currency_code = Column(String(3), default="VND")

    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    type = Column(String(20), nullable=False) # EXPENSE, INCOME, TRANSFER
    amount = Column(Float, nullable=False)
    currency_code = Column(String(3), default="VND")
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    note = Column(Text, nullable=True)

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_limit = Column(Float, nullable=False)

    items = relationship("BudgetItem", back_populates="budget", cascade="all, delete-orphan")

class BudgetItem(Base):
    __tablename__ = "budget_items"
    id = Column(String, primary_key=True)
    budget_id = Column(String, ForeignKey("budgets.id"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    limit_amount = Column(Float, nullable=False)
    spent_amount = Column(Float, default=0.0)

    budget = relationship("Budget", back_populates="items")
    category = relationship("Category")

class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0.0)
    target_date = Column(Date, nullable=True)
    status = Column(String(20), default="ACTIVE")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
