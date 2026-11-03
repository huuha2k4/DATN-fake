# app/classify/memory.py
"""
Bộ nhớ cá nhân hóa theo từng người dùng.

Khi người dùng sửa "Circle K" → "Ăn uống" thay vì "Mua sắm",
lần sau với CHÍNH người đó, Circle K luôn là Ăn uống.

Lưu trữ: SQLite (đủ cho đồ án, khi có BE thì chuyển sang PostgreSQL).
"""
import sqlite3
import threading
from pathlib import Path
from typing import Optional


class UserMemory:
    """
    Lưu và truy vấn quy tắc danh mục riêng của từng người dùng.

    Thread-safe: dùng threading.local để mỗi thread có connection riêng
    (SQLite không chia sẻ connection giữa các thread).
    """

    def __init__(self, db_path: str = "classify_data/user_memory.db"):
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        # Tạo bảng nếu chưa có
        self._conn().execute("""
            CREATE TABLE IF NOT EXISTS user_rules (
                user_id   TEXT NOT NULL,
                key       TEXT NOT NULL,       -- normalize(text)
                category  TEXT NOT NULL,
                count     INTEGER DEFAULT 1,
                PRIMARY KEY (user_id, key)
            )
        """)
        self._conn().commit()

    def _conn(self) -> sqlite3.Connection:
        """Lấy connection của thread hiện tại, tạo mới nếu chưa có."""
        if not getattr(self._local, "conn", None):
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        return self._local.conn

    def get(self, user_id: str, key: str) -> Optional[str]:
        """
        Trả về danh mục người dùng đã ghi nhớ cho key này, None nếu chưa có.
        key nên là normalize(merchant_name).
        """
        row = self._conn().execute(
            "SELECT category FROM user_rules WHERE user_id=? AND key=?",
            (user_id, key),
        ).fetchone()
        return row[0] if row else None

    def remember(self, user_id: str, key: str, category: str) -> None:
        """
        Lưu hoặc cập nhật quy tắc danh mục cho người dùng.
        Nếu đã có → cập nhật category và tăng count.
        """
        self._conn().execute(
            """INSERT INTO user_rules (user_id, key, category)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id, key)
               DO UPDATE SET category=excluded.category,
                             count=count+1""",
            (user_id, key, category),
        )
        self._conn().commit()

    def forget(self, user_id: str, key: str) -> None:
        """Xóa 1 quy tắc cụ thể."""
        self._conn().execute(
            "DELETE FROM user_rules WHERE user_id=? AND key=?",
            (user_id, key),
        )
        self._conn().commit()

    def list_rules(self, user_id: str) -> list[dict]:
        """Trả về tất cả quy tắc của một người dùng."""
        rows = self._conn().execute(
            "SELECT key, category, count FROM user_rules WHERE user_id=? ORDER BY count DESC",
            (user_id,),
        ).fetchall()
        return [{"key": r[0], "category": r[1], "count": r[2]} for r in rows]

    def stats(self) -> dict:
        """Thống kê tổng quan."""
        n_users = self._conn().execute(
            "SELECT COUNT(DISTINCT user_id) FROM user_rules"
        ).fetchone()[0]
        n_rules = self._conn().execute(
            "SELECT COUNT(*) FROM user_rules"
        ).fetchone()[0]
        return {"n_users": n_users, "n_rules": n_rules}
