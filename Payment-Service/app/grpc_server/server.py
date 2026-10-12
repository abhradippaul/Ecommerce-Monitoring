import concurrent.futures
import grpc
from app.protos import cart_pb2_grpc
from app.grpc_server.services.cart_service import CartServiceServicer
from app.core.config import settings
from app.core.logger import logger


def create_grpc_server() -> grpc.Server:
    server = grpc.server(concurrent.futures.ThreadPoolExecutor(max_workers=10))
    cart_pb2_grpc.add_CartServiceServicer_to_server(CartServiceServicer(), server)
    return server


def start_grpc_server(port: int = settings.grpc_port) -> grpc.Server:
    server = create_grpc_server()
    server.add_insecure_port(f"0.0.0.0:{port}")
    try:
        server.add_insecure_port(f"[::]:{port}")
    except Exception:
        pass
    server.start()
    logger.info(f"gRPC CartService server listening on 0.0.0.0:{port}")
    return server
