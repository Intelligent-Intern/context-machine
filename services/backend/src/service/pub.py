import os
import requests
import json
from typing import Dict, Any

class PubService:
    """WebSocket publishing service for sending events to frontend clients"""
    
    def __init__(self):
        self.websocket_url = os.getenv("WEBSOCKET_SERVICE_URL", "http://context-machine-websocket-service:3011")
        self.api_key = os.getenv("API_KEY", "dev-key-123")
    
    def publish(self, action: str, payload: Dict[Any, Any]) -> bool:
        """
        Publish event to WebSocket service for frontend delivery
        
        Args:
            action: Action name (e.g. "chat.message", "auth.login")
            payload: Event payload data
            
        Returns:
            bool: True if published successfully, False otherwise
        """
        try:
            event = {
                "api_key": self.api_key,
                "a": action,
                "p": payload
            }
            
            response = requests.post(
                self.websocket_url,
                json=event,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"[PUB] Published event: {action}")
                return True
            else:
                print(f"[PUB] Failed to publish {action}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[PUB] Error publishing {action}: {e}")
            return False
    
    def publish_response(self, original_action: str, response_data: Dict[Any, Any]) -> bool:
        """
        Publish response to a frontend action
        
        Args:
            original_action: The original action that triggered this response
            response_data: Response payload
            
        Returns:
            bool: True if published successfully
        """
        response_action = f"{original_action}.response"
        return self.publish(response_action, response_data)
    
    def publish_error(self, original_action: str, error_message: str) -> bool:
        """
        Publish error response to frontend
        
        Args:
            original_action: The original action that failed
            error_message: Error description
            
        Returns:
            bool: True if published successfully
        """
        error_action = f"{original_action}.error"
        return self.publish(error_action, {"error": error_message})