import argparse
import getpass
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from core.database import SessionLocal
from core.security import get_password_hash
from models.user import User


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    args = parser.parse_args()
    email = args.email.strip().lower()
    password = getpass.getpass("Admin password: ")
    confirmation = getpass.getpass("Repeat admin password: ")
    if len(password) < 12 or password != confirmation:
        raise SystemExit("Password must be at least 12 characters and match the confirmation")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(email=email)
            db.add(user)
        user.hashed_password = get_password_hash(password)
        user.is_active = True
        user.is_verified = True
        user.is_superuser = True
        db.commit()
        print(f"Admin account ready: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
