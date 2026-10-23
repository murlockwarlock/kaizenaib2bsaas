"""
Migration: добавляет is_verified в users и ставит is_verified=True всем существующим пользователям.
Запускать один раз из директории backend/:
    python scripts/add_verification.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'mvp.db')

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Добавляем колонку (ошибка если уже есть — игнорируем)
try:
    cur.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0 NOT NULL")
    print("✓ Column is_verified added")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e):
        print("⚠ Column is_verified already exists, skipping")
    else:
        raise

# Все существующие пользователи — уже верифицированы
cur.execute("UPDATE users SET is_verified = 1 WHERE is_verified = 0")
updated = cur.rowcount
conn.commit()
conn.close()

print(f"✓ Set is_verified=1 for {updated} existing user(s)")
print("Done.")
