import os
import posixpath
import uuid
from secrets import compare_digest

from fastapi import HTTPException, UploadFile, status

ALLOWED_IMAGE_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
    "image/gif": (b"GIF87a", b"GIF89a"),
}

ALLOWED_AUDIO_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "audio/mpeg": (b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"),
    "audio/wav": (b"RIFF",),
    "audio/x-wav": (b"RIFF",),
    "audio/ogg": (b"OggS",),
    "audio/aac": (b"\xff\xf1", b"\xff\xf9", b"ADIF"),
}

ALLOWED_VIDEO_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "video/mp4": (b"\x00\x00\x00",),
    "video/webm": (b"\x1a\x45\xdf\xa3",),
    "video/avi": (b"RIFF",),
}

FILE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/avi": "avi",
}


def _detect_image_type(content: bytes) -> str | None:
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image/webp"

    for mime_type, signatures in ALLOWED_IMAGE_SIGNATURES.items():
        if any(content.startswith(signature) for signature in signatures):
            return mime_type
    return None


def _detect_audio_type(content: bytes) -> str | None:
    if content.startswith(b"RIFF") and content[8:12] == b"WAVE":
        return "audio/wav"

    for mime_type, signatures in ALLOWED_AUDIO_SIGNATURES.items():
        if any(content.startswith(signature) for signature in signatures):
            return mime_type
    return None


def _detect_video_type(content: bytes) -> str | None:
    if len(content) >= 12 and content[4:8] == b"ftyp":
        return "video/mp4"
    if content.startswith(b"RIFF") and content[8:12] == b"AVI ":
        return "video/avi"
    if content.startswith(b"\x1a\x45\xdf\xa3"):
        return "video/webm"

    for mime_type, signatures in ALLOWED_VIDEO_SIGNATURES.items():
        if any(content.startswith(signature) for signature in signatures):
            return mime_type
    return None


def _resolve_media_type(content: bytes, upload: UploadFile) -> str | None:
    detected = _detect_image_type(content) or _detect_audio_type(content) or _detect_video_type(content)
    content_type = (upload.content_type or "").strip().lower()
    filename = (upload.filename or "").lower()

    if detected in {"audio/wav", "audio/x-wav"}:
        return "audio/wav"

    if detected == "video/mp4" and content_type == "audio/mp4":
        return "audio/mp4"

    if detected:
        return detected

    if content_type in FILE_EXTENSIONS:
        return content_type

    extension = os.path.splitext(filename)[1].lower()
    extension_to_mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".aac": "audio/aac",
        ".m4a": "audio/mp4",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".avi": "video/avi",
    }
    return extension_to_mime.get(extension)


def save_validated_upload(
    upload: UploadFile,
    *,
    upload_root: str,
    max_bytes: int,
    subdir: str = "",
) -> str:
    content = upload.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {max_bytes // (1024 * 1024)} MB limit",
        )

    mime_type = _resolve_media_type(content, upload)
    if not mime_type or mime_type not in FILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed formats: JPEG, PNG, WEBP, GIF, MP3, WAV, OGG, AAC, M4A, MP4, WEBM, AVI",
        )

    safe_subdir = subdir.strip("/").replace("\\", "/")
    target_dir = os.path.join(upload_root, safe_subdir) if safe_subdir else upload_root
    os.makedirs(target_dir, exist_ok=True)

    extension = FILE_EXTENSIONS[mime_type]
    filename = f"{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(target_dir, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    relative_path = posixpath.join(*(part for part in [upload_root.strip("/"), safe_subdir, filename] if part))
    return f"/{relative_path}"


def save_validated_image_upload(
    upload: UploadFile,
    *,
    upload_root: str,
    max_bytes: int,
    subdir: str = "",
) -> str:
    return save_validated_upload(
        upload,
        upload_root=upload_root,
        max_bytes=max_bytes,
        subdir=subdir,
    )


def resolve_upload_path(file_path: str, upload_root: str) -> str:
    normalized = posixpath.normpath(file_path).lstrip("/")
    if not normalized or normalized == "." or normalized.startswith("../"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    root_abs = os.path.abspath(upload_root)
    candidate = os.path.abspath(os.path.join(root_abs, normalized))
    if os.path.commonpath([root_abs, candidate]) != root_abs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if not os.path.isfile(candidate):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return candidate


def guess_safe_content_type(file_path: str) -> str:
    extension = os.path.splitext(file_path)[1].lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".aac": "audio/aac",
        ".m4a": "audio/mp4",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".avi": "video/avi",
    }.get(extension, "application/octet-stream")


def is_valid_shared_secret(provided: str | None, expected: str | None) -> bool:
    if not provided or not expected:
        return False
    return compare_digest(provided, expected)
