import sqlite3
import sys
import os

if len(sys.argv) < 2:
    print("Usage: python make_admin.py <user_email>")
    sys.exit(1)

email = sys.argv[1]
db_path = os.path.join(os.path.dirname(__file__), 'mvp.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("UPDATE users SET is_superuser = 1 WHERE email = ?", (email,))
if cursor.rowcount > 0:
    print(f"Success! User '{email}' is now a superuser. You can now access the /admin panel.")
else:
    print(f"Error: User with email '{email}' not found. Did you register first?")

conn.commit()
conn.close()
