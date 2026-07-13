from pydantic import BaseModel
from app.schemas.userrole import UserRoleEnum


class FileUploadResponse(BaseModel):
    filename: str
    url: str


class PresignedUrlResponse(BaseModel):
    url: str


class FileUploadSchema(BaseModel):
    file_name: str
    role: UserRoleEnum


class UploadPresignedUrlResponse(BaseModel):
    file_name: str
    upload_url: str


class GetPresignedUrlPreviewSchema(BaseModel):
    file_name: str


class GetPresignedUrlPreviewResponse(BaseModel):
    file_name: str
    preview_url: str


class DeleteFileSchema(BaseModel):
    file_name: str
