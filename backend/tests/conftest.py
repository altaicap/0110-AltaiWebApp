"""
Pytest configuration and fixtures for Altai Trader tests
"""

import pytest
import os
import sys
from typing import Generator

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Set test environment variables
os.environ["ENVIRONMENT"] = "test"
os.environ["LOG_LEVEL"] = "INFO"

@pytest.fixture(scope="session")
def test_settings():
    """Test settings fixture"""
    from config import settings
    return settings


@pytest.fixture(scope="function")
def mock_polygon_data():
    """Mock Polygon API response data"""
    return {
        "status": "OK",
        "results": [
            {
                "t": 1704352800000,  # 2024-01-03 15:00:00 UTC
                "o": 186.06,
                "h": 186.50,
                "l": 185.50,
                "c": 186.25,
                "v": 1000000,
                "vw": 186.20
            },
            {
                "t": 1704356400000,  # 2024-01-03 16:00:00 UTC
                "o": 186.25,
                "h": 187.10,
                "l": 186.00,
                "c": 186.90,
                "v": 1200000,
                "vw": 186.75
            }
        ]
    }


@pytest.fixture(scope="function")
def mock_news_articles():
    """Mock news articles data"""
    from datetime import datetime
    
    return [
        {
            "id": "test_article_1",
            "headline": "Test Market Update",
            "body": "This is a test article for unit testing purposes.",
            "source": "NewsWare",
            "published_at": datetime.utcnow(),
            "tickers": ["AAPL", "MSFT"],
            "category": "business",
            "metadata": {"priority": "high"}
        },
        {
            "id": "test_article_2", 
            "headline": "Technology Sector Analysis",
            "body": "Analysis of technology sector trends and developments.",
            "source": "TradeXchange",
            "published_at": datetime.utcnow(),
            "tickers": ["GOOGL", "NVDA"],
            "category": "technology",
            "metadata": {"importance": "medium"}
        }
    ]


@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Cleanup fixture that runs after each test"""
    yield
    # Add any cleanup logic here if needed
    pass


def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "requires_api: mark test as requiring real API keys"
    )