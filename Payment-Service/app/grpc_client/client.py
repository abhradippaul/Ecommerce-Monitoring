import grpc
from app.protos import cart_pb2, cart_pb2_grpc
from app.core.config import settings


def get_cart_grpc_client(target: str = settings.order_service_grpc_url) -> cart_pb2_grpc.CartServiceStub:
    channel = grpc.insecure_channel(target)
    return cart_pb2_grpc.CartServiceStub(channel)


def fetch_cart_by_user_id(
    user_id: str,
    target: str = settings.order_service_grpc_url,
    timeout: float = 5.0,
) -> cart_pb2.Cart:
    client = get_cart_grpc_client(target)
    request = cart_pb2.GetCartRequest(userId=user_id)
    return client.GetCart(request, timeout=timeout)
