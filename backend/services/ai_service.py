"""
AI/Claude Integration Service
Handles dashboard Q&A, customer support, and watchlist imports via Claude
"""

import asyncio
import logging
import pandas as pd
import io
import json
import re
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Union
from fastapi import HTTPException, status, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
import httpx
import uuid

logger = logging.getLogger(__name__)

class AIAssistant:
    """Claude AI assistant for dashboard support and data processing"""
    
    def __init__(self, db: AsyncIOMotorDatabase, claude_api_key: Optional[str] = None):
        self.db = db
        self.claude_api_key = claude_api_key or self._get_emergent_key()
        self.api_base_url = "https://api.anthropic.com/v1"
        self.timeout = httpx.Timeout(60.0)  # Longer timeout for AI responses
        
    def _get_emergent_key(self) -> Optional[str]:
        """Get Claude API key from Emergent integrations"""
        try:
            # Import emergent integrations if available
            from emergentintegrations import get_universal_key
            return get_universal_key()
        except ImportError:
            logger.warning("Emergent integrations not available, using environment variable")
            import os
            return os.getenv("CLAUDE_API_KEY")
    
    async def handle_dashboard_query(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        date_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Handle dashboard-related questions using Claude
        
        Args:
            user_id: User identifier
            message: User's question about their dashboard/performance
            context: Additional context (optional)
            date_range: Explicit date range from user query (overrides header filter)
        
        Returns:
            Response with Claude's answer and suggested actions
        """
        
        try:
            # Extract date range from message if not provided
            if not date_range:
                date_range = self._extract_date_range_from_message(message)
            
            # If no explicit date range found, use default (not header filter)
            if not date_range:
                end_date = date.today()
                start_date = end_date - timedelta(days=365)  # Default to 1 year
                date_range = {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
                date_context = f"Using default 1-year period: {start_date.isoformat()} to {end_date.isoformat()}"
            else:
                date_context = f"Using requested period: {date_range['start']} to {date_range['end']}"
            
            # Fetch relevant dashboard data
            dashboard_data = await self._fetch_dashboard_data(user_id, date_range)
            
            # Prepare context for Claude
            claude_context = self._prepare_dashboard_context(dashboard_data, date_context)
            
            # Generate Claude prompt
            system_prompt = """You are an expert trading performance analyst assistant for Altai Trader. 
            You help users understand their trading performance by analyzing their dashboard data.
            
            Your responses should be:
            - Clear and concise
            - Data-driven with specific numbers
            - Actionable when possible
            - Professional but friendly
            
            Always mention the time period you're analyzing in your response.
            If you see concerning patterns, offer constructive suggestions.
            """
            
            user_prompt = f"""
            User Question: {message}
            
            Trading Performance Data:
            {claude_context}
            
            Please analyze this data and provide a helpful response to the user's question.
            Include specific numbers from their performance data.
            """
            
            # Call Claude API
            claude_response = await self._call_claude_api(system_prompt, user_prompt)
            
            # Parse response and generate suggested actions
            suggested_actions = self._generate_suggested_actions(message, dashboard_data)
            
            return {
                "response": claude_response,
                "sources": [f"Dashboard data from {date_range['start']} to {date_range['end']}"],
                "suggested_actions": suggested_actions,
                "date_range_used": date_range
            }
            
        except Exception as e:
            logger.error(f"Error handling dashboard query: {str(e)}")
            return {
                "response": "I apologize, but I encountered an error while analyzing your dashboard data. Please try again or contact support if the issue persists.",
                "sources": [],
                "suggested_actions": [
                    {"type": "link", "title": "View Dashboard", "url": "/dashboard"},
                    {"type": "link", "title": "Contact Support", "url": "/support"}
                ],
                "error": str(e)
            }
    
    async def handle_support_query(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle customer support and feature help queries"""
        
        try:
            # Prepare system prompt for support
            system_prompt = """You are a helpful customer support assistant for Altai Trader, 
            a comprehensive trading platform with the following features:
            
            - Dashboard with performance metrics and charts
            - Strategy development and backtesting 
            - Broker integrations (TradeStation, IBKR, Robinhood, Coinbase, Kraken)
            - Live trading capabilities
            - Watchlists and portfolio tracking
            - News and market data integration
            
            Provide clear, helpful answers about features and functionality.
            When relevant, suggest specific screens or actions the user can take.
            Be friendly and professional.
            """
            
            user_prompt = f"""
            User Question: {message}
            
            Please provide helpful information about Altai Trader's features or assist with their question.
            If relevant, mention specific screens they should navigate to.
            """
            
            # Call Claude API
            claude_response = await self._call_claude_api(system_prompt, user_prompt)
            
            # Generate suggested actions based on the query
            suggested_actions = self._generate_support_actions(message)
            
            return {
                "response": claude_response,
                "sources": ["Altai Trader Knowledge Base"],
                "suggested_actions": suggested_actions
            }
            
        except Exception as e:
            logger.error(f"Error handling support query: {str(e)}")
            return {
                "response": "I apologize, but I encountered an error while processing your question. Please contact our support team directly for assistance.",
                "sources": [],
                "suggested_actions": [
                    {"type": "link", "title": "Contact Support", "url": "/support"}
                ],
                "error": str(e)
            }
    
    async def handle_watchlist_upload(
        self,
        user_id: str,
        file: UploadFile
    ) -> Dict[str, Any]:
        """Handle Excel/CSV watchlist upload and parsing"""
        
        try:
            # Validate file type
            if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File must be CSV or Excel format (.csv, .xlsx, .xls)"
                )
            
            # Check file size (limit to 5MB)
            file_content = await file.read()
            if len(file_content) > 5 * 1024 * 1024:  # 5MB
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size must be less than 5MB"
                )
            
            # Parse file content
            df = await self._parse_uploaded_file(file_content, file.filename)
            
            if df.empty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File appears to be empty or could not be parsed"
                )
            
            # Generate import ID for tracking
            import_id = str(uuid.uuid4())
            
            # Analyze columns and suggest mappings
            column_mapping = await self._analyze_columns(df.columns.tolist())
            
            # Generate preview data (first 5 rows)
            preview_data = df.head(5).to_dict('records')
            
            # Store temporary import data
            import_data = {
                "id": import_id,
                "user_id": user_id,
                "filename": file.filename,
                "columns": df.columns.tolist(),
                "row_count": len(df),
                "preview_data": preview_data,
                "full_data": df.to_dict('records'),  # Store full data temporarily
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(hours=1)  # Expire after 1 hour
            }
            
            # Store in database temporarily
            await self.db.temp_imports.insert_one(import_data)
            
            return {
                "import_id": import_id,
                "preview": {
                    "filename": file.filename,
                    "total_rows": len(df),
                    "columns": df.columns.tolist(),
                    "sample_data": preview_data
                },
                "mapping_suggestions": column_mapping,
                "message": f"Successfully parsed {len(df)} rows from {file.filename}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error handling watchlist upload: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing file: {str(e)}"
            )
    
    async def confirm_watchlist_import(
        self,
        user_id: str,
        import_id: str,
        column_mapping: Dict[str, str],
        watchlist_name: str
    ) -> Dict[str, Any]:
        """Confirm and execute watchlist import with user-specified column mapping"""
        
        try:
            # Retrieve import data
            import_data = await self.db.temp_imports.find_one({
                "id": import_id,
                "user_id": user_id
            })
            
            if not import_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Import data not found or expired"
                )
            
            # Check if expired
            if datetime.utcnow() > import_data["expires_at"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Import data has expired. Please upload the file again."
                )
            
            # Create watchlist
            watchlist_id = str(uuid.uuid4())
            
            # Prepare column definitions
            columns_config = []
            for field, source_column in column_mapping.items():
                if source_column and source_column != "ignore":
                    columns_config.append({
                        "name": field,
                        "type": "text",  # Default to text, could be enhanced
                        "source_column": source_column
                    })
            
            watchlist_record = {
                "id": watchlist_id,
                "user_id": user_id,
                "name": watchlist_name,
                "description": f"Imported from {import_data['filename']}",
                "columns": columns_config,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Store watchlist
            await self.db.watchlists.insert_one(watchlist_record)
            
            # Process and import data
            imported_items = []
            errors = []
            
            for row_idx, row_data in enumerate(import_data["full_data"]):
                try:
                    # Extract ticker (required field)
                    ticker_column = column_mapping.get("ticker")
                    if not ticker_column or ticker_column not in row_data:
                        errors.append(f"Row {row_idx + 1}: Missing ticker")
                        continue
                    
                    ticker = str(row_data.get(ticker_column, "")).strip().upper()
                    if not ticker:
                        errors.append(f"Row {row_idx + 1}: Empty ticker")
                        continue
                    
                    # Validate ticker format (basic validation)
                    if not re.match(r'^[A-Z0-9]{1,10}$', ticker):
                        errors.append(f"Row {row_idx + 1}: Invalid ticker format '{ticker}'")
                        continue
                    
                    # Extract other mapped fields
                    item_data = {"ticker": ticker}
                    for field, source_column in column_mapping.items():
                        if field != "ticker" and source_column and source_column in row_data:
                            value = row_data.get(source_column)
                            if value is not None:
                                item_data[field] = str(value).strip()
                    
                    # Create watchlist item
                    item_record = {
                        "id": str(uuid.uuid4()),
                        "watchlist_id": watchlist_id,
                        "user_id": user_id,
                        "ticker": ticker,
                        "data": item_data,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    
                    imported_items.append(item_record)
                    
                except Exception as e:
                    errors.append(f"Row {row_idx + 1}: {str(e)}")
            
            # Insert valid items
            if imported_items:
                await self.db.watchlist_items.insert_many(imported_items)
            
            # Clean up temporary import data
            await self.db.temp_imports.delete_one({"id": import_id})
            
            return {
                "watchlist_id": watchlist_id,
                "watchlist_name": watchlist_name,
                "imported_count": len(imported_items),
                "total_rows": len(import_data["full_data"]),
                "errors": errors[:10] if errors else [],  # Limit error messages
                "error_count": len(errors),
                "message": f"Successfully imported {len(imported_items)} items into '{watchlist_name}'"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error confirming watchlist import: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error importing watchlist: {str(e)}"
            )
    
    async def _parse_uploaded_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """Parse uploaded CSV or Excel file"""
        
        try:
            if filename.lower().endswith('.csv'):
                # Try different encodings for CSV
                for encoding in ['utf-8', 'latin-1', 'cp1252']:
                    try:
                        df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError("Could not decode CSV file with supported encodings")
                    
            else:  # Excel file
                df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
            
            # Clean column names
            df.columns = df.columns.astype(str).str.strip()
            
            # Remove empty rows
            df = df.dropna(how='all')
            
            return df
            
        except Exception as e:
            logger.error(f"Error parsing file {filename}: {str(e)}")
            raise ValueError(f"Could not parse file: {str(e)}")
    
    async def _analyze_columns(self, columns: List[str]) -> Dict[str, Any]:
        """Analyze columns and suggest field mappings using Claude"""
        
        # Define standard watchlist fields
        standard_fields = [
            "ticker", "name", "sector", "industry", "market_cap", 
            "price", "target_price", "stop_loss", "entry_price",
            "notes", "comments", "weight", "priority"
        ]
        
        # Simple heuristic mapping (could be enhanced with Claude)
        mapping_suggestions = {}
        
        for field in standard_fields:
            best_match = None
            best_score = 0
            
            for col in columns:
                col_lower = col.lower()
                field_lower = field.lower()
                
                # Exact match
                if col_lower == field_lower:
                    best_match = col
                    best_score = 100
                    break
                
                # Partial matches with scoring
                if field_lower in col_lower or col_lower in field_lower:
                    score = 80
                elif field_lower == "ticker" and any(x in col_lower for x in ["symbol", "stock", "ticker"]):
                    score = 90
                elif field_lower == "name" and any(x in col_lower for x in ["company", "name", "security"]):
                    score = 85
                elif field_lower == "price" and any(x in col_lower for x in ["price", "value", "cost"]):
                    score = 85
                else:
                    score = 0
                
                if score > best_score:
                    best_match = col
                    best_score = score
            
            if best_match and best_score >= 70:
                mapping_suggestions[field] = {
                    "suggested_column": best_match,
                    "confidence": best_score,
                    "required": field == "ticker"
                }
            else:
                mapping_suggestions[field] = {
                    "suggested_column": None,
                    "confidence": 0,
                    "required": field == "ticker"
                }
        
        return {
            "available_columns": columns,
            "field_mappings": mapping_suggestions,
            "required_fields": ["ticker"]
        }
    
    async def _call_claude_api(self, system_prompt: str, user_prompt: str) -> str:
        """Make API call to Claude"""
        
        if not self.claude_api_key:
            return "AI assistant is not configured. Please check Claude API key configuration."
        
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.claude_api_key,
            "anthropic-version": "2023-06-01"
        }
        
        payload = {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 1000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_prompt}
            ]
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.api_base_url}/messages",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code != 200:
                    logger.error(f"Claude API error: {response.status_code} - {response.text}")
                    return "I apologize, but I'm having trouble connecting to my AI service. Please try again later."
                
                response_data = response.json()
                return response_data["content"][0]["text"]
                
        except Exception as e:
            logger.error(f"Error calling Claude API: {str(e)}")
            return "I encountered an error while processing your request. Please try again later."
    
    def _extract_date_range_from_message(self, message: str) -> Optional[Dict[str, str]]:
        """Extract date range from user message"""
        
        # Simple date extraction (could be enhanced with more sophisticated NLP)
        today = date.today()
        
        message_lower = message.lower()
        
        # Common date patterns
        if "last month" in message_lower:
            end_date = today.replace(day=1) - timedelta(days=1)  # Last day of previous month
            start_date = end_date.replace(day=1)  # First day of previous month
            return {"start": start_date.isoformat(), "end": end_date.isoformat()}
        
        elif "this month" in message_lower:
            start_date = today.replace(day=1)
            return {"start": start_date.isoformat(), "end": today.isoformat()}
        
        elif "last week" in message_lower:
            end_date = today - timedelta(days=today.weekday() + 1)  # Last Sunday
            start_date = end_date - timedelta(days=6)  # Previous Monday
            return {"start": start_date.isoformat(), "end": end_date.isoformat()}
        
        elif any(x in message_lower for x in ["ytd", "year to date"]):
            start_date = today.replace(month=1, day=1)
            return {"start": start_date.isoformat(), "end": today.isoformat()}
        
        # Could add more sophisticated date parsing here
        return None
    
    async def _fetch_dashboard_data(
        self, 
        user_id: str, 
        date_range: Dict[str, str]
    ) -> Dict[str, Any]:
        """Fetch relevant dashboard data for the specified date range"""
        
        try:
            # Import metrics service
            from services.metrics_service import get_metrics_service
            
            # Convert date strings to date objects
            start_date = datetime.fromisoformat(date_range["start"]).date()
            end_date = datetime.fromisoformat(date_range["end"]).date()
            
            # Get metrics service and fetch dashboard data
            metrics_service = get_metrics_service(self.db)
            
            metrics = await metrics_service.get_dashboard_metrics(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date
            )
            
            return {
                "total_trades": metrics.total_trades,
                "win_rate_trades": metrics.win_rate_trades,
                "win_rate_days": metrics.win_rate_days,
                "profit_factor": metrics.profit_factor,
                "avg_win": metrics.avg_win,
                "avg_loss": metrics.avg_loss,
                "total_pnl": metrics.total_pnl,
                "total_return": metrics.total_return,
                "trading_days": metrics.trading_days,
                "date_range": f"{start_date} to {end_date}"
            }
            
        except Exception as e:
            logger.error(f"Error fetching dashboard data: {str(e)}")
            return {"error": f"Could not fetch dashboard data: {str(e)}"}
    
    def _prepare_dashboard_context(
        self, 
        dashboard_data: Dict[str, Any], 
        date_context: str
    ) -> str:
        """Prepare dashboard data context for Claude"""
        
        if "error" in dashboard_data:
            return f"Error fetching data: {dashboard_data['error']}"
        
        context = f"""
Time Period: {date_context}

Performance Summary:
- Total Trades: {dashboard_data.get('total_trades', 'N/A')}
- Win Rate (by trades): {dashboard_data.get('win_rate_trades', 'N/A')}%
- Win Rate (by days): {dashboard_data.get('win_rate_days', 'N/A')}%
- Profit Factor: {dashboard_data.get('profit_factor', 'N/A')}
- Average Win: ${dashboard_data.get('avg_win', 'N/A')}
- Average Loss: ${dashboard_data.get('avg_loss', 'N/A')}
- Total P&L: ${dashboard_data.get('total_pnl', 'N/A')}
- Total Return: {dashboard_data.get('total_return', 'N/A')}%
- Active Trading Days: {dashboard_data.get('trading_days', 'N/A')}
        """.strip()
        
        return context
    
    def _generate_suggested_actions(
        self, 
        message: str, 
        dashboard_data: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Generate suggested actions based on the query and data"""
        
        actions = []
        
        # Always suggest viewing the dashboard
        actions.append({
            "type": "link",
            "title": "View Full Dashboard",
            "url": "/dashboard"
        })
        
        # Suggest specific actions based on message content
        message_lower = message.lower()
        
        if any(x in message_lower for x in ["strategy", "backtest", "test"]):
            actions.append({
                "type": "link", 
                "title": "Run Backtest",
                "url": "/backtests"
            })
        
        if any(x in message_lower for x in ["trade", "position", "order"]):
            actions.append({
                "type": "link",
                "title": "View Trades",
                "url": "/dashboard?tab=positions"
            })
        
        if any(x in message_lower for x in ["broker", "connect", "account"]):
            actions.append({
                "type": "link",
                "title": "Manage Brokers", 
                "url": "/settings?tab=connectivity"
            })
        
        return actions
    
    def _generate_support_actions(self, message: str) -> List[Dict[str, str]]:
        """Generate support-related suggested actions"""
        
        actions = []
        message_lower = message.lower()
        
        if any(x in message_lower for x in ["dashboard", "performance", "metrics"]):
            actions.append({
                "type": "link",
                "title": "Go to Dashboard",
                "url": "/dashboard"
            })
        
        if any(x in message_lower for x in ["strategy", "backtest"]):
            actions.append({
                "type": "link", 
                "title": "Strategies & Backtests",
                "url": "/strategies"
            })
        
        if any(x in message_lower for x in ["broker", "connect", "integration"]):
            actions.append({
                "type": "link",
                "title": "Broker Connections",
                "url": "/settings?tab=connectivity"
            })
        
        if any(x in message_lower for x in ["watchlist", "symbols"]):
            actions.append({
                "type": "link",
                "title": "Manage Watchlists", 
                "url": "/strategies?tab=watchlist"
            })
        
        # Always provide support contact
        actions.append({
            "type": "link",
            "title": "Contact Support",
            "url": "/support"
        })
        
        return actions

# Global service instance
ai_assistant = None

def get_ai_assistant(db: AsyncIOMotorDatabase) -> AIAssistant:
    """Get or create AI assistant instance"""
    global ai_assistant
    if ai_assistant is None:
        ai_assistant = AIAssistant(db)
    return ai_assistant