#!/usr/bin/env python3
"""
Script to add the Prior Bar Break Algorithm to the strategies database
"""

import asyncio
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def add_pbh_strategy():
    """Add the Prior Bar Break Algo strategy to the database"""
    
    # Read the strategy code from file
    with open('/app/python_strategies/pbh_algo.py', 'r') as f:
        strategy_code = f.read()
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/altai_trader')
    client = AsyncIOMotorClient(mongo_url)
    db = client.altai_trader
    
    # Create the strategy document
    strategy = {
        "id": str(uuid.uuid4()),
        "name": "Prior Bar Break Algo",
        "description": "Advanced breakout strategy with comprehensive filters and multi-TP management system. Ports the TradingView Pine Script 'PBH Algo - CHUCK (w/ Partials)' to Backtrader with RVOL filters, ADR logic, session management, pyramiding, and move-stop functionality.",
        "code": strategy_code,
        "parameters": {
            "take_long": {"type": "bool", "default": True, "label": "Take Long Positions"},
            "take_short": {"type": "bool", "default": False, "label": "Take Short Positions"},
            "use_eod": {"type": "bool", "default": True, "label": "Use End of Day Exit"},
            "max_entry_count": {"type": "int", "default": 2, "min": 1, "max": 10, "label": "Max Entries Per Day"},
            "vol_ma_period": {"type": "int", "default": 50, "min": 10, "max": 200, "label": "Volume MA Period"},
            "rvol": {"type": "float", "default": 1.0, "min": 0.1, "max": 5.0, "label": "Min Relative Volume"},
            "min_abs_volume": {"type": "int", "default": 100000, "min": 10000, "max": 10000000, "label": "Min Absolute Volume"},
            "buffer_perc": {"type": "float", "default": 0.01, "min": 0.001, "max": 0.1, "label": "Entry Buffer (%)"},
            "tp_multiplier_1": {"type": "float", "default": 300.0, "min": 50, "max": 1000, "label": "TP1 Multiplier"},
            "tp_multiplier_2": {"type": "float", "default": 500.0, "min": 50, "max": 1000, "label": "TP2 Multiplier"},
            "tp_multiplier_3": {"type": "float", "default": 700.0, "min": 50, "max": 1000, "label": "TP3 Multiplier"},
            "tp_multiplier_4": {"type": "float", "default": 900.0, "min": 50, "max": 1000, "label": "TP4 Multiplier"},
            "timeframe": {"type": "str", "default": "1m", "options": ["1m", "5m", "15m", "30m", "1h", "1D"], "label": "Timeframe"}
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Check if strategy already exists
    existing = await db.strategies.find_one({"name": "Prior Bar Break Algo"})
    
    if existing:
        # Update existing strategy
        await db.strategies.update_one(
            {"name": "Prior Bar Break Algo"},
            {"$set": {
                "description": strategy["description"],
                "code": strategy["code"],
                "parameters": strategy["parameters"],
                "updated_at": datetime.utcnow()
            }}
        )
        print("✅ Updated existing Prior Bar Break Algo strategy")
    else:
        # Insert new strategy
        await db.strategies.insert_one(strategy)
        print("✅ Added new Prior Bar Break Algo strategy")
    
    # Close the connection
    client.close()
    print(f"Strategy ID: {strategy['id']}")

if __name__ == "__main__":
    asyncio.run(add_pbh_strategy())