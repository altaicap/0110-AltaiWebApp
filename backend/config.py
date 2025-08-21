"""
Configuration management for Altai Trader backend
"""

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings"""
    
    # Database
    mongo_url: str = Field(default="mongodb://localhost:27017", env="MONGO_URL")
    db_name: str = Field(default="altai_trader", env="DB_NAME")
    
    # API Keys
    polygon_api_key: Optional[str] = Field(default=None, env="POLYGON_API_KEY")
    newsware_api_key: Optional[str] = Field(default=None, env="NEWSWARE_API_KEY")
    tradexchange_api_key: Optional[str] = Field(default=None, env="TRADEXCHANGE_API_KEY")
    tradestation_client_id: Optional[str] = Field(default=None, env="TRADESTATION_CLIENT_ID")
    tradestation_client_secret: Optional[str] = Field(default=None, env="TRADESTATION_CLIENT_SECRET")
    
    # Security
    secret_key: str = Field(default="altai-trader-secret-key-2024", env="SECRET_KEY")
    api_key_salt: str = Field(default="altai-salt-2024", env="API_KEY_SALT")
    
    # CORS Settings
    cors_origins: list = Field(default=["http://localhost:3000"], env="CORS_ORIGINS")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # Backtrader Settings
    backtest_timeout: int = Field(default=300, env="BACKTEST_TIMEOUT")  # 5 minutes
    max_memory_mb: int = Field(default=1024, env="MAX_MEMORY_MB")  # 1GB
    max_cpu_percent: float = Field(default=80.0, env="MAX_CPU_PERCENT")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()