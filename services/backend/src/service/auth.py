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
                    "config": self._get_frontend_config(str(user.id))
                }
                
        except Exception as e:
            print(f"[AUTH] Login error: {e}")
            return None
    
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
        Generate frontend configuration based on user permissions
        
        Args:
            user_id: User ID string
            
        Returns:
            Frontend config with modules, pages, and widgets based on user access
        """
        try:
            with self.db_service.get_session() as session:
                # Get user object
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"modules": [], "pages": [], "widgetPacks": []}
                
                from models import Module, Page, Widget
                
                # Get active modules
                modules = session.query(Module).filter(Module.is_active == True).all()
                module_list = []
                for module in modules:
                    widgets = session.query(Widget).filter(
                        Widget.module_id == module.id,
                        Widget.is_active == True
                    ).all()
                    
                    widget_names = [f"{module.name}@{widget.name}" for widget in widgets]
                    
                    module_list.append({
                        "id": module.name,
                        "name": module.display_name,
                        "widgets": widget_names
                    })
                
                # Get active pages based on user role
                if user and user.role == UserRole.SUPERADMIN:
                    # Superadmin sees all pages
                    pages = session.query(Page).filter(Page.is_active == True).all()
                else:
                    # Regular users see pages without specific permissions
                    from models.page import page_permissions
                    pages_with_permissions = session.query(Page.id).join(page_permissions).distinct()
                    pages = session.query(Page).filter(
                        Page.is_active == True,
                        ~Page.id.in_(pages_with_permissions)
                    ).all()
                
                page_list = []
                for page in pages:
                    page_list.append({
                        "route": page.route,
                        "name": page.name,
                        "layout": page.layout_config or {"top": True, "main": True}
                    })
                
                # Get widget packs with new naming schema
                widget_packs = []
                for module in modules:
                    widgets = session.query(Widget).filter(
                        Widget.module_id == module.id,
                        Widget.is_active == True
                    ).all()
                    
                    components = {}
                    for widget in widgets:
                        components[widget.name] = {
                            "path": widget.component_path
                        }
                    
                    if components:
                        # Use new widget pack naming schema
                        widget_pack_id = f"widget-pack/{module.name}/ui/550e8400-e29b-41d4-a716-446655440000/1.0.0"
                        widget_packs.append({
                            "id": widget_pack_id,
                            "name": f"{module.display_name} Widget Pack",
                            "module": module.name,
                            "type": "ui",
                            "projectId": "550e8400-e29b-41d4-a716-446655440000",
                            "version": "1.0.0",
                            "components": components
                        })
                
                return {
                    "modules": module_list,
                    "pages": page_list,
                    "widgetPacks": widget_packs
                }
                
        except Exception as e:
            print(f"[AUTH] Config generation error: {e}")
            return {
                "modules": [],
                "pages": [],
                "widgetPacks": []
            }