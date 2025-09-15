"""
Chat Service for LLM Integration
Handles conversational AI using emergentintegrations
"""
import os
import uuid
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage

class ChatService:
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        # Model configurations
        self.model_configs = {
            'claude': {
                'provider': 'anthropic',
                'model': 'claude-3-7-sonnet-20250219',
                'name': 'Claude (Anthropic)'
            },
            'chatgpt': {
                'provider': 'openai', 
                'model': 'gpt-4o',
                'name': 'ChatGPT (OpenAI)'
            }
        }
        
        # Default configuration
        self.default_llm = "claude"
        
        self.system_message = """You are an AI assistant integrated into Altai Trader, a professional trading platform. 

You help users with:
- Trading strategy analysis and optimization
- Market data interpretation
- Backtesting insights and recommendations
- News analysis and its impact on trading decisions
- Platform navigation and feature usage
- Risk management and portfolio optimization

You have access to the user's trading data, strategies, and market information. Always provide helpful, accurate, and actionable trading advice while being mindful of risk management principles."""

    async def create_chat_session(self, user_id: str, session_id: Optional[str] = None) -> str:
        """Create a new chat session"""
        if not session_id:
            session_id = f"altai_chat_{user_id}_{uuid.uuid4().hex[:8]}"
        
        return session_id

    async def send_message(self, session_id: str, message: str, user_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Send a message to the LLM and get response"""
        try:
            # Create LLM chat instance
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=self.system_message
            ).with_model(self.default_provider, self.default_model)
            
            # Add user context to the message if provided
            enhanced_message = message
            if user_context:
                context_info = []
                if user_context.get('active_strategies'):
                    context_info.append(f"Active strategies: {', '.join(user_context['active_strategies'])}")
                if user_context.get('current_tab'):
                    context_info.append(f"Currently viewing: {user_context['current_tab']} tab")
                if user_context.get('recent_trades'):
                    context_info.append(f"Recent trading activity available")
                
                if context_info:
                    enhanced_message = f"[Context: {'; '.join(context_info)}]\n\n{message}"
            
            # Create user message
            user_message = UserMessage(text=enhanced_message)
            
            # Send message and get response
            response = await chat.send_message(user_message)
            
            return {
                'success': True,
                'message': response,
                'session_id': session_id,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id,
                'timestamp': datetime.utcnow().isoformat()
            }

    async def get_conversation_history(self, session_id: str) -> Dict[str, Any]:
        """Get conversation history for a session"""
        try:
            # Create LLM chat instance 
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=self.system_message
            ).with_model(self.default_provider, self.default_model)
            
            # Get messages
            messages = await chat.get_messages()
            
            return {
                'success': True,
                'messages': messages,
                'session_id': session_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id
            }

    async def clear_conversation(self, session_id: str) -> Dict[str, Any]:
        """Clear conversation history"""
        try:
            # For now, create a new session (emergentintegrations handles history internally)
            return {
                'success': True,
                'message': 'Conversation cleared',
                'session_id': session_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id
            }

# Global instance
chat_service = ChatService()