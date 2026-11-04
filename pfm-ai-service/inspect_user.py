import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal, Category, Account

db = SessionLocal()
cats = db.query(Category).all()
print('FIRST CAT ID:', type(cats[0].id), repr(cats[0].id))

accs = db.query(Account).all()
print('FIRST ACC ID:', type(accs[0].id), repr(accs[0].id), 'USER_ID:', type(accs[0].user_id), repr(accs[0].user_id))

db.close()
