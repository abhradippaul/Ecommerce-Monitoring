from fastapi import APIRouter, HTTPException, Depends
from app.services import s3_service
from app.schemas.file import (
    UploadPresignedUrlResponse,
    FileUploadSchema,
    GetPresignedUrlPreviewResponse,
    GetPresignedUrlPreviewSchema,
    DeleteFileSchema,
)
from app.core.config import settings
from uuid import uuid4
from app.services.rate_limit import verify_rate_limit

router = APIRouter()

@router.post("/presigned-url/upload", response_model=UploadPresignedUrlResponse)
async def generate_upload_presigned_url(file_request: FileUploadSchema, client_ip: str = Depends(verify_rate_limit)):
    # The rate limit has already executed successfully if code reaches here!
    print(f"Request allowed for IP: {client_ip}")
    file_name = file_request.file_name
    file_extension = file_name.split(".")[-1]
    key = f"{file_request.role}/{settings.s3_avatar_images_folder}/{uuid4()}.{file_extension}"
    upload_url = s3_service.generate_upload_presigned_url(
        key, f"image/{file_extension}"
    )
    return {"file_name": key, "upload_url": upload_url}


@router.post("/presigned-url/preview", response_model=GetPresignedUrlPreviewResponse)
async def generate_presigned_preview_url(file_request: GetPresignedUrlPreviewSchema):
    file_name = file_request.file_name
    if not file_name:
        raise HTTPException(status_code=400, detail="File name is required")
    preview_url = s3_service.generate_presigned_preview_url(file_name)
    return {"file_name": file_name, "preview_url": preview_url}


@router.delete("/", status_code=204)
def delete_file(file_request: DeleteFileSchema):
    return s3_service.delete_file(file_request.file_name)
