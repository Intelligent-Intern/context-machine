from typing import Dict, Any, List, Optional
from .database import DatabaseService
from models import Theme, ProjectTheme, UserPreference, User, Project
import uuid
import json

class ThemeService:
    """Theme management service for handling theme CRUD operations"""
    
    def __init__(self):
        self.db_service = DatabaseService()
    
    def list_themes(self, user_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all available themes for the user"""
        try:
            with self.db_service.get_session() as session:
                # Get all active themes (system + user's custom themes)
                themes = session.query(Theme).filter(
                    Theme.is_active == True
                ).all()
                
                theme_list = []
                for theme in themes:
                    # Include system themes and user's own themes
                    if theme.created_by is None or str(theme.created_by) == user_info.get('id'):
                        theme_list.append({
                            "id": str(theme.id),
                            "name": theme.name,
                            "display_name": theme.display_name,
                            "description": theme.description,
                            "css_variables": theme.css_variables,
                            "is_default": theme.is_default,
                            "is_custom": theme.created_by is not None,
                            "created_by": str(theme.created_by) if theme.created_by else None,
                            "created_at": theme.created_at.isoformat() if theme.created_at else None
                        })
                
                return theme_list
                
        except Exception as e:
            print(f"[THEME] Error listing themes: {e}")
            raise
    
    def get_theme(self, theme_id: str, user_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get a specific theme by ID"""
        try:
            with self.db_service.get_session() as session:
                theme = session.query(Theme).filter(
                    Theme.id == uuid.UUID(theme_id),
                    Theme.is_active == True
                ).first()
                
                if not theme:
                    return None
                
                # Check if user can access this theme (system themes or own themes)
                if theme.created_by is not None and str(theme.created_by) != user_info.get('id'):
                    return None
                
                return {
                    "id": str(theme.id),
                    "name": theme.name,
                    "display_name": theme.display_name,
                    "description": theme.description,
                    "css_variables": theme.css_variables,
                    "is_default": theme.is_default,
                    "is_custom": theme.created_by is not None,
                    "created_by": str(theme.created_by) if theme.created_by else None,
                    "created_at": theme.created_at.isoformat() if theme.created_at else None
                }
                
        except Exception as e:
            print(f"[THEME] Error getting theme {theme_id}: {e}")
            raise
    
    def create_theme(self, theme_data: Dict[str, Any], user_info: Dict[str, Any]) -> str:
        """Create a new custom theme"""
        try:
            with self.db_service.get_session() as session:
                # Validate required fields
                if not theme_data.get('name') or not theme_data.get('display_name'):
                    raise ValueError("Theme name and display_name are required")
                
                # Check if theme name already exists
                existing = session.query(Theme).filter(
                    Theme.name == theme_data['name'],
                    Theme.is_active == True
                ).first()
                
                if existing:
                    raise ValueError(f"Theme with name '{theme_data['name']}' already exists")
                
                # Create new theme
                theme = Theme(
                    id=uuid.uuid4(),
                    name=theme_data['name'],
                    display_name=theme_data['display_name'],
                    description=theme_data.get('description', ''),
                    css_variables=theme_data.get('css_variables', {}),
                    is_default=False,  # Custom themes can't be system default
                    is_active=True,
                    created_by=uuid.UUID(user_info['id'])
                )
                
                session.add(theme)
                session.commit()
                
                return str(theme.id)
                
        except Exception as e:
            print(f"[THEME] Error creating theme: {e}")
            raise
    
    def update_theme(self, theme_id: str, theme_data: Dict[str, Any], user_info: Dict[str, Any]) -> bool:
        """Update an existing theme (only if user owns it)"""
        try:
            with self.db_service.get_session() as session:
                theme = session.query(Theme).filter(
                    Theme.id == uuid.UUID(theme_id),
                    Theme.is_active == True
                ).first()
                
                if not theme:
                    raise ValueError("Theme not found")
                
                # Only allow updating own themes (not system themes)
                if theme.created_by is None or str(theme.created_by) != user_info.get('id'):
                    raise ValueError("You can only update your own themes")
                
                # Update fields
                if 'display_name' in theme_data:
                    theme.display_name = theme_data['display_name']
                if 'description' in theme_data:
                    theme.description = theme_data['description']
                if 'css_variables' in theme_data:
                    theme.css_variables = theme_data['css_variables']
                
                session.commit()
                return True
                
        except Exception as e:
            print(f"[THEME] Error updating theme {theme_id}: {e}")
            raise
    
    def delete_theme(self, theme_id: str, user_info: Dict[str, Any]) -> bool:
        """Delete a theme (only if user owns it)"""
        try:
            with self.db_service.get_session() as session:
                theme = session.query(Theme).filter(
                    Theme.id == uuid.UUID(theme_id),
                    Theme.is_active == True
                ).first()
                
                if not theme:
                    raise ValueError("Theme not found")
                
                # Only allow deleting own themes (not system themes)
                if theme.created_by is None or str(theme.created_by) != user_info.get('id'):
                    raise ValueError("You can only delete your own themes")
                
                # Soft delete
                theme.is_active = False
                session.commit()
                return True
                
        except Exception as e:
            print(f"[THEME] Error deleting theme {theme_id}: {e}")
            raise
    
    def get_user_preferences(self, user_info: Dict[str, Any], project_id: Optional[str] = None) -> Dict[str, Any]:
        """Get user theme preferences for a project"""
        try:
            with self.db_service.get_session() as session:
                # Use default project if none specified
                if not project_id:
                    # Get first active project as default
                    project = session.query(Project).filter(Project.is_active == True).first()
                    if project:
                        project_id = str(project.id)
                    else:
                        return {"theme_id": None, "preferences": {}}
                
                preference = session.query(UserPreference).filter(
                    UserPreference.user_id == uuid.UUID(user_info['id']),
                    UserPreference.project_id == uuid.UUID(project_id)
                ).first()
                
                if preference:
                    return {
                        "theme_id": str(preference.theme_id) if preference.theme_id else None,
                        "language": preference.language,
                        "preferences": preference.preferences_json or {}
                    }
                else:
                    return {"theme_id": None, "language": "en", "preferences": {}}
                
        except Exception as e:
            print(f"[THEME] Error getting user preferences: {e}")
            raise
    
    def set_user_theme_preference(self, theme_id: str, user_info: Dict[str, Any], project_id: Optional[str] = None) -> bool:
        """Set user's preferred theme for a project"""
        try:
            with self.db_service.get_session() as session:
                # Use default project if none specified
                if not project_id:
                    project = session.query(Project).filter(Project.is_active == True).first()
                    if project:
                        project_id = str(project.id)
                    else:
                        raise ValueError("No active project found")
                
                # Verify theme exists and user can access it
                theme = session.query(Theme).filter(
                    Theme.id == uuid.UUID(theme_id),
                    Theme.is_active == True
                ).first()
                
                if not theme:
                    raise ValueError("Theme not found")
                
                # Check access (system themes or own themes)
                if theme.created_by is not None and str(theme.created_by) != user_info.get('id'):
                    raise ValueError("You don't have access to this theme")
                
                # Get or create user preference
                preference = session.query(UserPreference).filter(
                    UserPreference.user_id == uuid.UUID(user_info['id']),
                    UserPreference.project_id == uuid.UUID(project_id)
                ).first()
                
                if preference:
                    preference.theme_id = uuid.UUID(theme_id)
                else:
                    preference = UserPreference(
                        id=uuid.uuid4(),
                        user_id=uuid.UUID(user_info['id']),
                        project_id=uuid.UUID(project_id),
                        theme_id=uuid.UUID(theme_id),
                        language='en',
                        preferences_json={}
                    )
                    session.add(preference)
                
                session.commit()
                return True
                
        except Exception as e:
            print(f"[THEME] Error setting user theme preference: {e}")
            raise
    
    def export_theme(self, theme_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Export theme data for sharing"""
        try:
            theme_data = self.get_theme(theme_id, user_info)
            if not theme_data:
                raise ValueError("Theme not found or access denied")
            
            # Remove internal fields for export
            export_data = {
                "name": theme_data["name"],
                "display_name": theme_data["display_name"],
                "description": theme_data["description"],
                "css_variables": theme_data["css_variables"],
                "version": "1.0.0",
                "exported_at": theme_data["created_at"]
            }
            
            return export_data
            
        except Exception as e:
            print(f"[THEME] Error exporting theme {theme_id}: {e}")
            raise
    
    def import_theme(self, theme_data: Dict[str, Any], user_info: Dict[str, Any]) -> str:
        """Import theme from exported data"""
        try:
            # Validate import data
            required_fields = ['name', 'display_name', 'css_variables']
            for field in required_fields:
                if field not in theme_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create unique name if conflicts
            base_name = theme_data['name']
            name = base_name
            counter = 1
            
            with self.db_service.get_session() as session:
                while session.query(Theme).filter(
                    Theme.name == name,
                    Theme.is_active == True
                ).first():
                    name = f"{base_name}_{counter}"
                    counter += 1
            
            # Create theme with imported data
            import_data = {
                "name": name,
                "display_name": theme_data['display_name'],
                "description": theme_data.get('description', 'Imported theme'),
                "css_variables": theme_data['css_variables']
            }
            
            return self.create_theme(import_data, user_info)
            
        except Exception as e:
            print(f"[THEME] Error importing theme: {e}")
            raise