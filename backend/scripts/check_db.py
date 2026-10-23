import os
import sys

# Add backend to path
sys.path.append('/home/user/.gemini/antigravity/scratch/ai_editor_mvp/backend')

from core.database import SessionLocal
from models.admin import ModelPricing

def list_pricing():
    db = SessionLocal()
    try:
        pricings = db.query(ModelPricing).all()
        print("Model Pricing in DB:")
        for p in pricings:
            print(f"ID: {p.id} | Model: {p.model_name} | Version: {p.version} | Resolution: {p.resolution} | Cost: {p.cost} | Is Active: {p.is_active}")
    finally:
        db.close()

if __name__ == "__main__":
    list_pricing()
