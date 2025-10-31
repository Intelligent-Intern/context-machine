import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from .database import DatabaseService
from models import User, UserRole

class AuthService:
    """JWT authentication service with database integration"""
    
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
        self.expiration_hours = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
        self.db_service = DatabaseService()
    
    def login(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user and return JWT token + frontend configuration
        
        Args:
            username: Username
            password: Password
            
        Returns:
            Dict with token, user info, and complete frontend config, or None if auth fails
        """
        try:
            # Check database connectivity first
            if not self.db_service.health_check():
                print("[AUTH] Database health check failed")
                return {
                    "error": "CONFIG_ERROR",
                    "error_type": "DATABASE_ERROR",
                    "message": "Unser Service ist aktuell nicht erreichbar. Bitte versuchen Sie es später erneut."
                }
            
            with self.db_service.get_session() as session:
                user = session.query(User).filter(User.username == username).first()
                
                if not user or not user.is_active:
                    return None
                
                # Verify password
                if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                    return None
                
                # Generate JWT token
                payload = {
                    "user_id": str(user.id),
                    "username": user.username,
                    "name": user.full_name or user.username,
                    "role": user.role.value.upper(),
                    "exp": datetime.utcnow() + timedelta(hours=self.expiration_hours)
                }
                
                token = jwt.encode(payload, self.secret_key, algorithm="HS256")
                
                # Get frontend configuration - this may raise exceptions for system errors
                try:
                    config = self._get_frontend_config(str(user.id))
                except Exception as config_error:
                    error_msg = str(config_error)
                    print(f"[AUTH] Configuration error for user {user.username}: {error_msg}")
                    
                    # Return error in response instead of None to distinguish from auth failure
                    return {
                        "error": "CONFIG_ERROR",
                        "error_type": error_msg,
                        "message": self._get_error_message(error_msg),
                        "user": {
                            "id": str(user.id),
                            "username": user.username,
                            "name": user.full_name or user.username,
                            "role": user.role.value.upper()
                        }
                    }
                
                # Return token + complete frontend configuration
                return {
                    "token": token,
                    "user": {
                        "id": str(user.id),
                        "username": user.username,
                        "name": user.full_name or user.username,
                        "email": user.email,
                        "role": user.role.value.upper()
                    },
                    "config": config
                }
                
        except Exception as e:
            print(f"[AUTH] Login error: {e}")
            # Return database error instead of None for better error handling
            return {
                "error": "CONFIG_ERROR", 
                "error_type": "DATABASE_ERROR",
                "message": "Unser Service ist aktuell nicht erreichbar. Bitte versuchen Sie es später erneut."
            }
    
    def forgot_password(self, username: str) -> bool:
        """
        Handle forgot password request
        
        Args:
            username: Username or email
            
        Returns:
            True if user exists and reset email would be sent, False otherwise
        """
        try:
            with self.db_service.get_session() as session:
                # Look up user by username or email
                user = session.query(User).filter(
                    (User.username == username) | (User.email == username)
                ).first()
                
                if not user or not user.is_active:
                    return False
                
                # TODO: Generate reset token and send email
                # For now, just log the request
                print(f"[AUTH] Password reset requested for user: {user.username} ({user.email})")
                
                # In a real implementation, you would:
                # 1. Generate a secure reset token
                # 2. Store it in database with expiration
                # 3. Send email with reset link
                
                return True
                
        except Exception as e:
            print(f"[AUTH] Forgot password error: {e}")
            return False
    
    def register(self, username: str, email: str, password: str, full_name: str = None) -> Optional[str]:
        """
        Register new user
        
        Args:
            username: Username
            email: Email address
            password: Password
            full_name: Full name (optional)
            
        Returns:
            User ID if successful, None if failed
        """
        try:
            with self.db_service.get_session() as session:
                # Check if user already exists
                existing_user = session.query(User).filter(
                    (User.username == username) | (User.email == email)
                ).first()
                
                if existing_user:
                    return None
                
                # Hash password
                password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                # Create new user
                new_user = User(
                    username=username,
                    email=email,
                    password_hash=password_hash,
                    full_name=full_name,
                    role=UserRole.USER,  # Default role
                    is_active=True
                )
                
                session.add(new_user)
                session.flush()  # Get the ID
                
                return str(new_user.id)
                
        except Exception as e:
            print(f"[AUTH] Registration error: {e}")
            return None
    
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token and return user info
        
        Args:
            token: JWT token string
            
        Returns:
            User info dict or None if invalid
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            return {
                "user_id": payload["user_id"],
                "username": payload["username"],
                "name": payload["name"],
                "role": payload["role"]
            }
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _get_frontend_config(self, user_id: str) -> Dict[str, Any]:
        """
        Generate simple frontend configuration without database access
        
        Args:
            user_id: User ID string
            
        Returns:
            Simple static config
        """
        # Simple static config - no database access
        config = {
            "page": [{
                "route": "/",
                "name": "Home",
                "layout": {
                    "bars": {"t": 0, "b": 0, "l": 2, "r": 0},
                    "ports": {
                        "t": [],
                        "b": [],
                        "m": ["dashboard@Default"],
                        "l": ["navigation@LeftNav"],
                        "r": []
                    }
                }
            }]
        }
        
        return config
    
    def _get_error_message(self, error_type: str) -> str:
        """
        Get user-friendly error message based on error type
        
        Args:
            error_type: Error type string
            
        Returns:
            User-friendly error message
        """
        error_messages = {
            "USER_NOT_FOUND": "Benutzer nicht gefunden. Bitte wenden Sie sich an den Administrator.",
            "SYSTEM_NOT_CONFIGURED": "System ist nicht konfiguriert. Bitte wenden Sie sich an den Administrator.",
            "ADMIN_CONFIG_MISSING": "Admin-Konfiguration fehlt. Das System ist nicht vollständig eingerichtet.",
            "DATABASE_ERROR": "Unser Service ist aktuell nicht erreichbar. Bitte versuchen Sie es später erneut."
        }
        
        return error_messages.get(error_type, "Ein unbekannter Fehler ist aufgetreten.")