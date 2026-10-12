import sys
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logger import logger


class Database:
    client: Optional[AsyncIOMotorClient] = None

    def get_database(self, name: Optional[str] = None) -> Optional[AsyncIOMotorDatabase]:
        if self.client:
            return self.client.get_default_database() if name is None else self.client[name]
        return None


db = Database()


async def connect_db():
    if settings.node_env == "test":
        return
    try:
        if db.client is None:
            db.client = AsyncIOMotorClient(
                settings.mongo_uri,
                maxPoolSize=10,
                minPoolSize=5,
                socketTimeoutMS=45000,
                serverSelectionTimeoutMS=5000,
            )
            # Ping database to verify connection
            await db.client.admin.command("ping")
            logger.info("Connected to MongoDB")
    except Exception as error:
        logger.error(f"Failed to connect to MongoDB: {error}")
        if settings.node_env in ("production", "uat"):
            sys.exit(1)


async def close_db():
    if db.client:
        db.client.close()
        db.client = None
        logger.info("Closed MongoDB connection")
