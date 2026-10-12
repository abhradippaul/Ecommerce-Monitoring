import grpc
from concurrent import futures
import pytest
from app.protos import cart_pb2, cart_pb2_grpc
from app.grpc_server.services.cart_service import CartServiceServicer


@pytest.fixture(scope="module")
def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=2))
    cart_pb2_grpc.add_CartServiceServicer_to_server(CartServiceServicer(), server)
    port = server.add_insecure_port("127.0.0.1:0")
    server.start()
    yield f"127.0.0.1:{port}"
    server.stop(grace=None)


def test_grpc_get_cart_success(grpc_server):
    channel = grpc.insecure_channel(grpc_server)
    stub = cart_pb2_grpc.CartServiceStub(channel)
    request = cart_pb2.GetCartRequest(userId="user-999")
    response = stub.GetCart(request)

    assert response.userId == "user-999"
    assert response.totalPrice == 0.0
    assert response.totalQuantity == 0
    assert len(response.items) == 0
    assert response.createdAt != ""


def test_grpc_get_cart_missing_user_id(grpc_server):
    channel = grpc.insecure_channel(grpc_server)
    stub = cart_pb2_grpc.CartServiceStub(channel)
    request = cart_pb2.GetCartRequest(userId="")
    with pytest.raises(grpc.RpcError) as exc_info:
        stub.GetCart(request)
    assert exc_info.value.code() == grpc.StatusCode.INVALID_ARGUMENT
    assert "userId is required" in exc_info.value.details()


def test_grpc_list_carts(grpc_server):
    channel = grpc.insecure_channel(grpc_server)
    stub = cart_pb2_grpc.CartServiceStub(channel)
    request = cart_pb2.ListCartsRequest()
    responses = list(stub.ListCarts(request))
    assert len(responses) == 0
