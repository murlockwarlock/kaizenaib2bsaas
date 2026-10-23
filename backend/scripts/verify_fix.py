import asyncio
import sys
import httpx

# Add backend to path
sys.path.append('/home/user/.gemini/antigravity/scratch/ai_editor_mvp/backend')

from core.database import SessionLocal
from models.user import User
from models.admin import ModelPricing
from services.kie_ai import request_kie_generation

async def verify_models():
    # We'll just test the logic that would be called
    test_cases = [
        {"model": "kling/v2-1-pro", "inputs": {"prompt": "test"}},
        {"model": "flux-2/pro-text-to-image", "inputs": {"prompt": "test"}},
        {"model": "topaz/image-upscale", "inputs": {"image_url": "http://example.com/image.jpg"}},
    ]

    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No user found to test with.")
            return

        print(f"Testing with user: {user.email}, Balance: {user.balance}")

        for case in test_cases:
            pricing = db.query(ModelPricing).filter(ModelPricing.model_name == case["model"]).first()
            if pricing:
                print(f"✅ Found pricing for {case['model']}: {pricing.cost} credits")
            else:
                print(f"❌ Pricing NOT found for {case['model']}")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(verify_models())
