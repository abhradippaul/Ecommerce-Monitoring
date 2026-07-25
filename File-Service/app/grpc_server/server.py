import concurrent.futures
from uuid import uuid4
import grpc
from app.protos import file_pb2, file_pb2_grpc
from app.services import s3_service
from app.core.config import settings


class FileServiceServicer(file_pb2_grpc.FileServiceServicer):
    def GetAvatarFilePreview(self, request, context):
        file_name = request.fileName
        if not file_name:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("File name is required")
            return file_pb2.AvatarFilePreviewResponse()

        try:
            preview_url = s3_service.generate_presigned_preview_url(file_name)
            return file_pb2.AvatarFilePreviewResponse(
                fileName=file_name,
                previewUrl=preview_url
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return file_pb2.AvatarFilePreviewResponse()

    def AvatarPresignedUrl(self, request, context):
        file_name = request.fileName
        role = request.role or "buyer"
        file_extension = file_name.split(".")[-1] if file_name else "jpg"
        key = f"{role}/{settings.s3_avatar_images_folder}/{uuid4()}.{file_extension}"

        try:
            upload_url = s3_service.generate_upload_presigned_url(
                key, f"image/{file_extension}"
            )
            return file_pb2.AvatarPresignedResponse(
                fileName=key,
                uploadUrl=upload_url
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return file_pb2.AvatarPresignedResponse()


def start_grpc_server(port: str = "50052"):
    server = grpc.server(concurrent.futures.ThreadPoolExecutor(max_workers=10))
    file_pb2_grpc.add_FileServiceServicer_to_server(FileServiceServicer(), server)
    server.add_insecure_port(f"0.0.0.0:{port}")
    try:
        server.add_insecure_port(f"[::]:{port}")
    except Exception:
        pass
    server.start()
    print(f"File-Service gRPC server running on port {port}")
    return server
