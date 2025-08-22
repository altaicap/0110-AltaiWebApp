"""
Database configuration and session management for Altai Trader
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

# MongoDB configuration (existing)
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "altai_trader")

# PostgreSQL configuration for user management and billing
POSTGRES_URL = os.getenv("POSTGRES_URL", "sqlite:///./altai_trader.db")

# SQLAlchemy setup for user management
engine = create_engine(
    POSTGRES_URL,
    connect_args={"check_same_thread": False} if "sqlite" in POSTGRES_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# MongoDB setup (existing)
mongodb_client = None
mongodb_db = None

class DatabaseManager:
    """Database management class for both SQL and MongoDB"""
    
    def __init__(self):
        self.sql_engine = engine
        self.mongodb_client = None
        self.mongodb_db = None
    
    async def initialize_databases(self):
        """Initialize both SQL and MongoDB connections"""
        try:
            # Initialize MongoDB
            self.mongodb_client = AsyncIOMotorClient(MONGO_URL)
            self.mongodb_db = self.mongodb_client[DB_NAME]
            
            # Test MongoDB connection
            await self.mongodb_client.admin.command('ping')
            logger.info("MongoDB connected successfully")
            
            # Initialize SQL database
            from models import Base
            Base.metadata.create_all(bind=self.sql_engine)
            logger.info("SQL database initialized successfully")
            
            # Create indexes
            await self.create_indexes()
            
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    async def create_indexes(self):
        """Create database indexes for optimal performance"""
        try:
            # MongoDB indexes (existing collections)
            collections = await self.mongodb_db.list_collection_names()
            
            if "news_articles" in collections:
                await self.mongodb_db.news_articles.create_index([("published_at", -1)])
                await self.mongodb_db.news_articles.create_index([("source", 1)])
                await self.mongodb_db.news_articles.create_index([("tickers", 1)])
            
            if "strategies" in collections:
                await self.mongodb_db.strategies.create_index([("updated_at", -1)])
                await self.mongodb_db.strategies.create_index([("is_live", 1)])
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    def get_sql_session(self) -> Session:
        """Get SQL database session"""
        return SessionLocal()
    
    def get_mongodb_db(self):
        """Get MongoDB database instance"""
        return self.mongodb_db
    
    async def close_connections(self):
        """Close all database connections"""
        if self.mongodb_client:
            self.mongodb_client.close()
        
        # SQLAlchemy engine cleanup happens automatically

# Global database manager instance
db_manager = DatabaseManager()

# Dependency to get SQL database session
def get_db_session():
    """FastAPI dependency to get database session"""
    db = db_manager.get_sql_session()
    try:
        yield db
    finally:
        db.close()

# Dependency to get MongoDB database
async def get_mongodb():
    """FastAPI dependency to get MongoDB database"""
    return db_manager.get_mongodb_db()

# Initialize default users for existing application
async def create_default_users():
    """Create default users (Alex G and Charles H) with password protection"""
    from models import User
    from auth import AuthService
    
    db = db_manager.get_sql_session()
    
    try:
        # Check if users already exist
        alex = db.query(User).filter(User.email == "alex@altaitrader.com").first()
        charles = db.query(User).filter(User.email == "charles@altaitrader.com").first()
        
        if not alex:
            alex_user = User(
                email="alex@altaitrader.com",
                full_name="Alex G",
                hashed_password=AuthService.hash_password("Altai2025"),
                is_active=True,
                is_verified=True,
                preferences={
                    "theme": "dark",
                    "notifications": {
                        "billing_reminders": True,
                        "trade_notifications": True,
                        "system_alerts": True
                    }
                }
            )
            db.add(alex_user)
            logger.info("Created default user: Alex G")
        
        if not charles:
            charles_user = User(
                email="charles@altaitrader.com", 
                full_name="Charles H",
                hashed_password=AuthService.hash_password("Altai2025"),
                is_active=True,
                is_verified=True,
                preferences={
                    "theme": "dark",
                    "notifications": {
                        "billing_reminders": True,
                        "trade_notifications": True,
                        "system_alerts": True
                    }
                }
            )
            db.add(charles_user)
            logger.info("Created default user: Charles H")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error creating default users: {str(e)}")
        db.rollback()
    finally:
        db.close()

# Database health check
async def check_database_health():
    """Check health of both databases"""
    health_status = {
        "mongodb": False,
        "sql": False,
        "timestamp": None
    }
    
    try:
        # Check MongoDB
        if db_manager.mongodb_client:
            await db_manager.mongodb_client.admin.command('ping')
            health_status["mongodb"] = True
        
        # Check SQL database
        db = db_manager.get_sql_session()
        db.execute("SELECT 1").fetchone()
        db.close()
        health_status["sql"] = True
        
        health_status["timestamp"] = str(datetime.utcnow())
        
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
    
    return health_status