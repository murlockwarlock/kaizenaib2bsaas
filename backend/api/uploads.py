import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from models.user import User
from api.deps import get_current_active_user
from core.config import settings
from core.upload_security import save_validated_upload

router = APIRouter()

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    try:
        file_url = save_validated_upload(
            file,
            upload_root=settings.UPLOAD_DIR,
            max_bytes=settings.UPLOAD_MAX_BYTES,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(exc)}") from exc

    return {"message": "Successfully uploaded", "url": file_url}
