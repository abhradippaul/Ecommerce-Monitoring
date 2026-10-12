from datetime import datetime, timezone
import grpc
from app.protos import cart_pb2, cart_pb2_grpc
from app.core.logger import logger


class CartServiceServicer(cart_pb2_grpc.CartServiceServicer):
    def GetCart(self, request, context):
        try:
            user_id = request.userId
            logger.info("gRPC GetCart request received", userId=user_id)

            if not user_id:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("userId is required")
                return cart_pb2.Cart()

            now_iso = datetime.now(timezone.utc).isoformat()
            return cart_pb2.Cart(
                id="",
                userId=user_id,
                items=[],
                totalPrice=0.0,
                totalQuantity=0,
                createdAt=now_iso,
                updatedAt=now_iso,
            )
        except Exception as error:
            logger.error("Error handling gRPC GetCart:", error=str(error))
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Internal server error while fetching cart")
            return cart_pb2.Cart()

    def ListCarts(self, request, context):
        logger.info("gRPC ListCarts request received")
        # Empty stream generator
        return
        yield
